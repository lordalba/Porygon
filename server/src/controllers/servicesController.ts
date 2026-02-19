import { Request, Response } from "express";
import { OpenShiftService } from "../services/openshiftService";
import WebSocketManager from "../websockets/websocketServer";
import { DeploymentService } from "../services/openshift/DeploymentService";
import { KubernetesConfig } from "../clients/KubernetesClient";
import { PostSyncHealthGuard } from "../services/openshift/PostSyncHealthGuard";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchNamespaceDeployments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { namespace, userToken, clusterUrl } = req.body;

  if (!namespace || !userToken || !clusterUrl) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const response = await fetch(
      `${clusterUrl}/apis/apps/v1/namespaces/${namespace}/deployments`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const t = await response.text();
      throw new Error(
        `Failed to fetch deployments: ${response.status} ${response.statusText} - ${t}`,
      );
    }

    const data = await response.json();
    const deploymentNames = (data.items || [])
      .map((d: any) => d.metadata?.name)
      .filter(Boolean);

    res.json({ deploymentNames });
  } catch (error) {
    console.error("Error fetching deployments:", error);
    res.status(500).json({ error: "Failed to fetch deployments" });
  }
};

/** Remove control chars and trim so token is safe for Authorization header */
function sanitizeToken(token: unknown): string {
  if (token == null || typeof token !== "string") return "";
  return token.replace(/[\r\n\t]/g, "").trim();
}

export const handleSyncService = async (
  req: Request,
  res: Response,
  websocketManager: WebSocketManager,
): Promise<void> => {
  const {
    namespace,
    serviceName,
    desiredVersion,
    desiredPodCount,
    saToken: rawSaToken,
    clusterUrl,
  } = req.body;

  const saToken = sanitizeToken(rawSaToken);

  // [SYNC_DEBUG] temporary - remove after debugging
  console.log("[SYNC_DEBUG] handleSyncService received:", {
    namespace,
    serviceName,
    desiredVersion,
    desiredPodCount,
    hasSaToken: !!saToken,
    hasClusterUrl: !!clusterUrl,
    clusterUrl: clusterUrl ? `${String(clusterUrl).slice(0, 40)}...` : undefined,
  });

  if (
    !namespace ||
    !serviceName ||
    !desiredVersion ||
    desiredPodCount == null ||
    !saToken ||
    !clusterUrl
  ) {
    console.log("[SYNC_DEBUG] handleSyncService rejected: missing required fields");
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    console.log("[SYNC_DEBUG] handleSyncService calling OpenShiftService.syncService");
    await OpenShiftService.syncService(
      namespace,
      serviceName,
      desiredVersion,
      desiredPodCount,
      saToken,
      clusterUrl,
      websocketManager,
    );

    console.log("[SYNC_DEBUG] handleSyncService completed successfully");
    res
      .status(200)
      .json({ message: `Service ${serviceName} synced successfully` });
  } catch (error: any) {
    console.error("[SYNC_DEBUG] handleSyncService error:", error?.message ?? error);
    console.error(`Error syncing service ${serviceName}:`, error);
    res.status(500).json({ error: error?.message ?? "Failed to sync service" });
  }
};

export const handleMultipleSyncService = async (
  req: Request,
  res: Response,
  websocketManager: WebSocketManager,
): Promise<void> => {
  const { namespace, servicesData, saToken: rawSaToken, clusterUrl } = req.body;
  const saToken = sanitizeToken(rawSaToken);

  if (!namespace || !Array.isArray(servicesData) || !saToken || !clusterUrl) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const config: KubernetesConfig = { token: saToken, clusterUrl };
  const deploymentService = new DeploymentService(config);

  // ✅ response once
  res.status(202).json({
    message: "Smart batch sync started",
    total: servicesData.length,
  });

  websocketManager.broadcast("BATCH_SYNC_STARTED", {
    namespace,
    total: servicesData.length,
    mode: "SMART_ROLLOUT_GUARD",
  });

  let successCount = 0;
  let errorCount = 0;
  const healthReports: Array<{ serviceName: string; report: any }> = [];

  const BETWEEN_SERVICES_DELAY_MS = 500;
  const healthGuard = new PostSyncHealthGuard(config, websocketManager);

  for (const service of servicesData) {
    const serviceName = service?.name;
    const desiredVersion = service?.desiredVersion;
    const desiredPodCount = service?.desiredPodCount;

    if (!serviceName || !desiredVersion || desiredPodCount == null) {
      errorCount++;
      websocketManager.broadcast("SYNC_COMPLETE", {
        namespace,
        serviceName: serviceName ?? "unknown",
        status: "error",
        error:
          "Invalid service payload (missing name/desiredVersion/desiredPodCount)",
      });
      await sleep(BETWEEN_SERVICES_DELAY_MS);
      continue;
    }

    try {
      // 1) Sync (patch image/replicas)
      await OpenShiftService.syncService(
        namespace,
        serviceName,
        desiredVersion,
        desiredPodCount,
        saToken,
        clusterUrl,
        websocketManager,
      );

      // 2) Wait rollout
      await deploymentService.waitForDeploymentRollout(
        namespace,
        serviceName,
        desiredPodCount,
        websocketManager,
        {
          pollIntervalMs: 2000,
          timeoutMs: 60_000,
        },
      );

      // 3) ✅ Guard: make sure no terminating pods before moving on
      await deploymentService.waitForNoTerminatingPods(
        namespace,
        serviceName,
        websocketManager,
        {
          pollIntervalMs: 2000,
          timeoutMs: 60_000,
          scope: "deployment", // שנה ל-"namespace" אם אתה רוצה guard על כל הניימספייס
          // labelSelectorOverride: `app=${serviceName}`, // אם יש לכם selector חד משמעי
        },
      );

      // 4) Post-sync health check
      try {
        const healthReport = await healthGuard.checkHealth(
          namespace,
          serviceName,
          desiredPodCount,
          {
            pollIntervalMs: 2000,
            timeoutMs: 300_000, // 5 minutes
          }
        );

        healthReports.push({ serviceName, report: healthReport });

        if (healthReport.severity === "ok") {
          websocketManager.broadcast("POST_SYNC_HEALTH_OK", {
            namespace,
            serviceName,
            report: healthReport,
          });
        } else {
          websocketManager.broadcast("POST_SYNC_HEALTH_ALERT", {
            namespace,
            serviceName,
            report: healthReport,
          });
        }
      } catch (healthError: any) {
        console.warn(`Health check failed for ${serviceName}:`, healthError);
        const errorReport = {
          namespace,
          serviceName,
          severity: "error" as const,
          summary: `Health check error: ${healthError?.message ?? String(healthError)}`,
          issues: [
            {
              type: "HealthCheckError",
              message: healthError?.message ?? String(healthError),
            },
          ],
          suggestedActions: [],
          timestamps: {
            detectedAt: new Date().toISOString(),
          },
        };
        healthReports.push({ serviceName, report: errorReport });
        websocketManager.broadcast("POST_SYNC_HEALTH_ALERT", {
          namespace,
          serviceName,
          report: errorReport,
        });
      }

      successCount++;
      websocketManager.broadcast("SYNC_COMPLETE", {
        namespace,
        serviceName,
        status: "success",
      });
    } catch (error: any) {
      errorCount++;

      websocketManager.broadcast("SYNC_COMPLETE", {
        namespace,
        serviceName,
        status: "error",
        error: error?.message ?? String(error),
      });
    }

    await sleep(BETWEEN_SERVICES_DELAY_MS);
  }

  // Send batch health summary
  const failingServices = healthReports.filter(
    (hr) => hr.report.severity === "error" || hr.report.severity === "warning"
  );
  if (failingServices.length > 0) {
    websocketManager.broadcast("BATCH_HEALTH_SUMMARY", {
      namespace,
      total: servicesData.length,
      failingServices: failingServices.map((hr) => ({
        serviceName: hr.serviceName,
        severity: hr.report.severity,
        summary: hr.report.summary,
        issueCount: hr.report.issues.length,
      })),
    });
  }

  websocketManager.broadcast("BATCH_SYNC_COMPLETE", {
    namespace,
    total: servicesData.length,
    successCount,
    errorCount,
    mode: "SMART_ROLLOUT_GUARD",
  });
};
