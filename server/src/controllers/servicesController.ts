import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import { profiles } from "../models/profile";
import { syncService } from "../services/openshiftService";
import WebSocketManager from "src/websockets/websocketServer";

export const getServices = async (req: Request, res: Response): Promise<void> => {
    console.log("in ze get services")
    const { namespace, userToken, clusterUrl } = req.body;
  
    if (!namespace || !userToken || !clusterUrl) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
  
    try {
      const response = await fetch(`${clusterUrl}/api/v1/namespaces/${namespace}/services`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }
  
      const data = await response.json();
      const serviceNames = data.items.map((service: any) => service.metadata.name);
      res.json({ serviceNames });
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  };

  export const updateTestingStatus = async (req: Request, res: Response): Promise<any> => {
    try {
      const { namespace, services, underTest, note, testGroupId } = req.body;
  
      if (!namespace || !Array.isArray(services) || typeof underTest !== "boolean") {
        return res.status(400).json({ error: "Invalid request data" });
      }
  
      const profile = profiles.find((p) => p.namespace === namespace);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
  
      const updatedServices = [];
      const groupId = underTest ? testGroupId || uuidv4() : null;
  
      for (const serviceName of services) {
        const service = profile.services.find((s) => s.name === serviceName);
        if (service) {
          service.underTest = underTest;
          if (underTest) {
            service.note = note || "";
            service.testGroupId = groupId; // Assign group ID
          } else {
            delete service.note;
            delete service.testGroupId; // Clear group ID
          }
          updatedServices.push(serviceName);
        }
      }
  
      if (updatedServices.length === 0) {
        return res.status(404).json({ error: "No services found to update" });
      }
  
      return res.status(200).json({
        message: "Services testing status updated successfully",
        updatedServices,
        groupId,
      });
    } catch (error) {
      console.error("Error updating testing status:", error);
      return res.status(500).json({ error: "Failed to update testing status" });
    }
  };

  export const handleSyncService = async (req: Request, res: Response, websocketManager: WebSocketManager): Promise<any> => {
    const { namespace, serviceName, desiredVersion, desiredPodCount, saToken, clusterUrl } = req.body;
  
    if (!namespace || !serviceName || !desiredVersion || desiredPodCount == null || !saToken || !clusterUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    try {
      await syncService(namespace, serviceName, desiredVersion, desiredPodCount, saToken, clusterUrl, websocketManager);
      console.log(`Synced service: ${serviceName}`);
      res.status(200).json({ message: `Service ${serviceName} synced successfully` });
    } catch (error) {
      console.error(`Error syncing service ${serviceName}:`, error);
      res.status(500).json({ error: "Failed to sync service" });
    }
  };
  