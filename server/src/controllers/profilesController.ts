import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import { profiles } from "../models/profile";
import { checkUserPermissions, setupNamespaceAccessWithUserAuth } from "../services/openshiftService";
import { createFullyUpdatedProfile } from "../services/ProfilesService";
// import { monitorOpenShiftChangesWithWatch } from "../utils/openshiftPoller";
import WebSocketManager from "../websockets/websocketServer";
import { monitorOpenShiftChanges } from "../utils/openshiftPoller";

const serviceAccountName = "porygon-sa";

// Fetch a single profile by ID
export const getProfileById = (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const profile = profiles.find((p) => p.id === id);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  return res.status(200).json(profile);
};

// Update a profile by ID
export const updateProfile = (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { name, namespace, services } = req.body;

  const profileIndex = profiles.findIndex((p) => p.id === id);

  if (profileIndex === -1) {
    return res.status(404).json({ error: "Profile not found" });
  }

  if (!name || !namespace || !Array.isArray(services)) {
    return res.status(400).json({ error: "Invalid profile data" });
  }

  profiles[profileIndex] = {
    id,
    name,
    namespace,
    services,
    clusterUrl: profiles[profileIndex].clusterUrl, // Retain the existing clusterUrl
    saToken: profiles[profileIndex].saToken,      // Retain the existing saToken
  };

  return res
    .status(200)
    .json({ message: "Profile updated successfully", profile: profiles[profileIndex] });
};

export const getProfiles = async (req: Request, res: Response) => {
  try {
    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        return await createFullyUpdatedProfile(profile);
      })
    );

    res.json(enrichedProfiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
};




export const createProfile = async (req: Request, res: Response, websocketManager: WebSocketManager, monitoredNamespaces: Set<string>): Promise<void> => {
  try {
    const { name, namespace, services, userToken, clusterUrl } = req.body;

    console.log(
      `name: ${name}, namespace: ${namespace}, services: ${JSON.stringify(services)}, userToken: ${userToken}, clusterUrl: ${clusterUrl}`
    );

    // Validate the incoming data
    if (!name || !namespace || !Array.isArray(services) || !userToken || !clusterUrl) {
      res.status(400).json({ error: "Invalid profile data" });
      return;
    }

    const saToken = await setupNamespaceAccessWithUserAuth(
      namespace,
      serviceAccountName,
      userToken,
      clusterUrl
    );

    console.log("ServiceAccount Token:", saToken);

    const hasPermission = await checkUserPermissions(
      namespace,
      saToken,
      clusterUrl,
      "services",
      "get"
    );

    if (hasPermission) {
      const initializedServices = services.map((service: any) => ({
        ...service,
        underTest: service.underTest ?? false, // Ensure underTest is explicitly set
        podCount: service.podCount ?? 1, // Default to 1 pod if not specified
      }));

      const profile = {
        id: uuidv4(),
        name,
        namespace,
        services: initializedServices,
        saToken,
        clusterUrl,
      };

      profiles.push(profile);
      // monitorOpenShiftChanges(namespace, saToken, clusterUrl, websocketManager);
      // monitorOpenShiftChangesWithWatch(saToken, clusterUrl, websocketManager);
      res.status(201).json({ message: "Profile created successfully", profile });
    } else {
      res.status(403).json({
        message: `User with token: ${userToken} does not have permissions on cluster: ${clusterUrl}`,
      });
    }
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
};
