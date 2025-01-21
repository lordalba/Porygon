import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import { TestingProfile } from "../models/TestingProfile";
import { profiles } from "../models/profile";

// In-memory store for testing profiles (replace with database later if needed)
let testingProfiles: TestingProfile[] = [];

// Get all testing profiles
export const getAllTestingProfiles = (req: Request, res: Response) => {
  res.json(testingProfiles);
};

// Create a new testing profile
export const createTestingProfile = (req: Request, res: Response) => {
  console.log("got new profile to create!");
  const newProfile: TestingProfile = {
    id: uuidv4(),
    ...req.body,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log(" the testing profile to add: " + JSON.stringify(newProfile));
  testingProfiles.push(newProfile);

  const profileIndex = profiles.findIndex((profile) => profile.id === req.body.profileId);
  profiles[profileIndex].testingProfiles.push(newProfile);
  res.status(201).json(newProfile);
};

// In your server file
export const activateTestingProfile = (req: Request, res: Response) => {
  const { profileId, testingProfileId } = req.body;

  // Find the profile and the testing profile
  const profile = profiles.find((p) => p.id === profileId);
  const testingProfile = testingProfiles.find((tp) => tp.id === testingProfileId);


  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  if (!testingProfile) {
    return res.status(404).json({ error: "Testing profile not found" });
  }

  testingProfile.isActive = true;

  profile.services.forEach((service) => {
    const testingService = testingProfile.services.find((s) => s.name === service.name);
    if (testingService) {
      console.log("yo I'm in ze activate for service: " + JSON.stringify(testingService))
      // Save the previous version as a backup (optional)
      service.previousVersion = service.version;
      // Update the service version to the desired version
      service.version = testingService.desiredVersion;
    }
  });

  return res.status(200).json({ message: "Testing profile activated successfully", profile });
};

export const deactivateTestingProfile = (req: Request, res: Response) => {
  const { profileId, testingProfileId } = req.body;

  // Find the profile by ID
  const profile = profiles.find((p) => p.id === profileId);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  profile.testingProfiles.forEach((testingProfile) => {
    if (testingProfile.id === testingProfileId) {
      testingProfile.isActive = false;
      testingProfile.services.forEach((testService) => {
        const profileService = profile.services.find((service) => service.name === testService.name);
        if (profileService && profileService.previousVersion) {
          profileService.version = profileService.previousVersion;
        }
      });
    }
  });

  return res.status(200).json({ message: "All testing profiles deactivated and service versions reverted successfully", profile });
};




// Update a testing profile
export const updateTestingProfile = (req: Request, res: Response) => {
  const { id } = req.params;
  const index = testingProfiles.findIndex((profile) => profile.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Testing profile not found" });
  }

  testingProfiles[index] = {
    ...testingProfiles[index],
    ...req.body,
    updatedAt: new Date(),
  };

  return res.json(testingProfiles[index]);
};

// Delete a testing profile
export const deleteTestingProfile = (req: Request, res: Response) => {
  const { id } = req.params;

  // Log the incoming details for debugging
  console.log(
    "Deleting testing profile with id: " + id + " for profile with id: " + req.body.profileId
  );

  // Remove the testing profile from the global list
  testingProfiles = testingProfiles.filter((profile) => profile.id !== id);

  // Find the corresponding profile
  const profile = profiles.find((p) => p.id === req.body.profileId);

  // Remove the testing profile from the profile's testingProfiles array
  if (profile) {
    profile.testingProfiles = profile.testingProfiles.filter((tp) => tp.id !== id);
  }

  // Respond with a no-content status
  res.status(204).send();
};
