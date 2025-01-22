import { Request, Response } from "express";
import { Profile } from "../models/Profile";
import { checkUserPermissions, setupNamespaceAccessWithUserAuth } from "../services/openshiftService";
import { createFullyUpdatedProfile } from "../services/ProfilesService";
import WebSocketManager from "../websockets/websocketServer";
import { monitorOpenShiftChanges } from "../utils/openshiftPoller";

// Fetch a single profile by ID
export const getProfileById = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  try {
    const profile = await Profile.findById(id).populate("testingProfiles");
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// Update a profile by ID
export const updateProfile = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { name, namespace, services } = req.body;

  try {
    const updatedProfile = await Profile.findByIdAndUpdate(
      id,
      { name, namespace, services },
      { new: true }
    ).populate("testingProfiles");

    if (!updatedProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json({ message: "Profile updated successfully", profile: updatedProfile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

// Fetch all profiles
export const getProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await Profile.find().populate("testingProfiles");

    // Optionally, enrich profiles if needed
    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        return await createFullyUpdatedProfile(profile.toObject());
      })
    );

    res.status(200).json(enrichedProfiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
};

// Create a new profile
export const createProfile = async (
  req: Request,
  res: Response,
  websocketManager: WebSocketManager,
  monitoredNamespaces: Set<string>
): Promise<void> => {
  try {
    const { name, namespace, services, userToken, clusterUrl } = req.body;

    // Validate the incoming data
    if (!name || !namespace || !Array.isArray(services) || !userToken || !clusterUrl) {
      res.status(400).json({ error: "Invalid profile data" });
      return;
    }

    // Setup namespace access with the user token
    const saToken = await setupNamespaceAccessWithUserAuth(
      namespace,
      "porygon-sa",
      userToken,
      clusterUrl
    );

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
        underTest: service.underTest ?? false,
        podCount: service.podCount ?? 1,
      }));

      // Create the profile in the database
      const profile = await Profile.create({
        name,
        namespace,
        services: initializedServices,
        clusterUrl,
        saToken,
        testingProfiles: [],
      });

      // Optionally monitor the namespace for changes
      monitorOpenShiftChanges(namespace, saToken, clusterUrl, websocketManager);

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
