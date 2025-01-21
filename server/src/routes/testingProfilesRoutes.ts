// src/routes/testingProfilesRoutes.ts
import express from "express";
import {
  getAllTestingProfiles,
  createTestingProfile,
  updateTestingProfile,
  deleteTestingProfile,
  activateTestingProfile,
} from "../controllers/testingProfilesController";

const router = express.Router();

router.get("/", getAllTestingProfiles);
router.post("/", createTestingProfile);
router.put("/:id", updateTestingProfile);
router.delete("/:id", deleteTestingProfile);
router.post("/:id/activate", activateTestingProfile);

export default router;
