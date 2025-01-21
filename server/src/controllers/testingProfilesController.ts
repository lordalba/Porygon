// src/controllers/testingProfilesController.ts
import { Request, Response } from "express";
import { TestingProfile } from "../models/TestingProfile";

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
    id: `profile-${Date.now()}`,
    ...req.body,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log(" the testing profile to add: " + JSON.stringify(newProfile));
  testingProfiles.push(newProfile);
  res.status(201).json(newProfile);
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
  testingProfiles = testingProfiles.filter((profile) => profile.id !== id);
  res.status(204).send();
};

// Activate a testing profile
export const activateTestingProfile = (req: Request, res: Response) => {
  const { id } = req.params;

  testingProfiles.forEach((profile) => {
    profile.isActive = profile.id === id; // Only one profile can be active
  });

  const activeProfile = testingProfiles.find((profile) => profile.id === id);
  if (!activeProfile) {
    return res.status(404).json({ error: "Testing profile not found" });
  }

  return res.json({ message: "Testing profile activated", activeProfile });
};
