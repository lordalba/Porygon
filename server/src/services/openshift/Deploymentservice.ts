import axios from "axios";
import {
  KubernetesClient,
  KubernetesConfig,
} from "../../clients/KubernetesClient";
import { ImageParser } from "../../utils/ImageParser";
import WebSocketManager from "../../websockets/websocketServer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isConditionTrue = (deployment: any, type: string) => {
  const conditions = deployment?.status?.conditions ?? [];
  const c = conditions.find((x: any) => x?.type === type);
  return c?.status === "True";
};

const describeProgress = (deployment: any) => {
  const st = deployment?.status ?? {};
  return {
    replicas: st.replicas ?? 0,
    updated: st.updatedReplicas ?? 0,
    ready: st.readyReplicas ?? 0,
    available: st.availableReplicas ?? 0,
    unavailable: st.unavailableReplicas ?? 0,
  };
};

type RolloutWaitOptions = {
  pollIntervalMs?: number; // כל כמה זמן לבדוק סטטוס
  timeoutMs?: number; // כמה זמן מקסימום לחכות לשירות
};

export interface DeploymentInfo {
  name: string;
  version: string;
  podCount: number;
}

interface Container {
  name: string;
  image: string;
}

interface DeploymentSpec {
  spec: {
    replicas: number;
    template: {
      spec: {
        containers: Container[];
      };
    };
  };
  status?: {
    readyReplicas?: number;
    availableReplicas?: number;
  };
  metadata: {
    name: string;
  };
}

interface DeploymentList {
  items: DeploymentSpec[];
}

/**
 * Manages Kubernetes Deployments
 */
export class DeploymentService extends KubernetesClient {
  constructor(config: KubernetesConfig) {
    super(config);
  }

  /**
   * Get all deployments in a namespace
   */
  async list(namespace: string): Promise<DeploymentSpec[]> {
    const response = await this.request<DeploymentList>(
      `/apis/apps/v1/namespaces/${namespace}/deployments`,
      { method: "GET" },
    );
    return response.items;
  }

  /**
   * Get a single deployment by name
   */
  async get(namespace: string, name: string): Promise<DeploymentSpec> {
    return this.request<DeploymentSpec>(
      `/apis/apps/v1/namespaces/${namespace}/deployments/${name}`,
      { method: "GET" },
    );
  }

  /**
   * Get versions and pod counts for all deployments in a namespace
   */
  async getVersionsAndPodCounts(
    namespace: string,
  ): Promise<Record<string, DeploymentInfo>> {
    console.log("Fetching deployment versions for namespace:", namespace);

    const deployments = await this.list(namespace);
    const versions: Record<string, DeploymentInfo> = {};

    for (const deployment of deployments) {
      const deploymentName = deployment?.metadata?.name;
      if (!deploymentName) continue;

      const containers = deployment?.spec?.template?.spec?.containers ?? [];
      const image = containers?.[0]?.image || "unknown";

      const version =
        image === "unknown" ? "unknown" : ImageParser.extractTag(image);

      // Prefer readyReplicas (actual running+ready pods)
      const ready = deployment?.status?.readyReplicas;
      const available = deployment?.status?.availableReplicas;

      const podCount =
        typeof ready === "number"
          ? ready
          : typeof available === "number"
            ? available
            : 0;

      versions[deploymentName] = {
        name: deploymentName,
        version,
        podCount,
      };
    }

    console.log("Computed deployment versions and pod counts:", versions);
    return versions;
  }

  /**
   * Update the image of a specific container in a deployment
   */
  async updateImage(
    namespace: string,
    deploymentName: string,
    containerIndex: number,
    newImage: string,
  ): Promise<void> {
    const url = `/apis/apps/v1/namespaces/${namespace}/deployments/${deploymentName}`;
    const patch = [
      {
        op: "replace",
        path: `/spec/template/spec/containers/${containerIndex}/image`,
        value: newImage,
      },
    ];

    await axios.patch(`${this.config.clusterUrl}${url}`, patch, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json-patch+json",
      },
    });

    console.log(
      `Updated image for deployment "${deploymentName}" to "${newImage}".`,
    );
  }

  /**
   * Scale a deployment to a specific number of replicas
   */
  async scale(
    namespace: string,
    deploymentName: string,
    replicas: number,
  ): Promise<void> {
    const url = `/apis/apps/v1/namespaces/${namespace}/deployments/${deploymentName}`;
    const patch = [{ op: "replace", path: "/spec/replicas", value: replicas }];

    await axios.patch(`${this.config.clusterUrl}${url}`, patch, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json-patch+json",
      },
    });

    console.log(
      `Scaled deployment "${deploymentName}" to ${replicas} replicas.`,
    );
  }

  /**
   * Find the index of a container by name in the deployment spec
   */
  findContainerIndex(containers: Container[], containerName: string): number {
    return containers.findIndex((c) => c.name === containerName);
  }

  /**
   * Wait until a deployment finishes rollout to desired replicas (or timeout).
   */
  /**
   * Wait until a deployment finishes rollout to desired replicas (or timeout).
   */
  async waitForDeploymentRollout(
    namespace: string,
    deploymentName: string,
    desiredReplicas: number,
    websocketManager: WebSocketManager,
    opts: RolloutWaitOptions = {},
  ): Promise<void> {
    const pollIntervalMs = opts.pollIntervalMs ?? 2000;
    const timeoutMs = opts.timeoutMs ?? 1 * 60 * 1000;

    const start = Date.now();

    websocketManager.broadcast("SYNC_STEP", {
      namespace,
      serviceName: deploymentName,
      step: "WAITING_FOR_ROLLOUT",
      desiredReplicas,
      pollIntervalMs,
      timeoutMs,
    });

    while (true) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(
          `Rollout timeout for "${deploymentName}" after ${Math.round(timeoutMs / 1000)}s`,
        );
      }

      const deployment = await this.get(namespace, deploymentName);

      const generation = (deployment as any)?.metadata?.generation ?? 0;
      const observedGeneration =
        (deployment as any)?.status?.observedGeneration ?? 0;

      const st = (deployment as any)?.status ?? {};
      const updated = st.updatedReplicas ?? 0;
      const available = st.availableReplicas ?? 0;

      const progressingOk = isConditionTrue(deployment, "Progressing");
      const availableOk = isConditionTrue(deployment, "Available");

      websocketManager.broadcast("SYNC_STEP", {
        namespace,
        serviceName: deploymentName,
        step: "ROLLOUT_PROGRESS",
        generation,
        observedGeneration,
        progressingOk,
        availableOk,
        ...describeProgress(deployment),
        desiredReplicas,
      });

      const done =
        observedGeneration >= generation &&
        updated >= desiredReplicas &&
        available >= desiredReplicas &&
        availableOk;

      if (done) return;

      await sleep(pollIntervalMs);
    }
  }
}
