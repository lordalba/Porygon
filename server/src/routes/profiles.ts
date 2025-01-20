import { Router } from "express";
import { getProfileById, createProfile, getProfiles, updateProfile } from "../controllers/profilesController";
import WebSocketManager from "src/websockets/websocketServer";

const profilesRoutes = (websocketManager: WebSocketManager, monitoredNamespaces: Set<string>) => {
    const router = Router();

    router.get("/:id", getProfileById);
    router.put("/:id", updateProfile);
    router.get("/", getProfiles);
    router.post("/", (req, res) => createProfile(req, res, websocketManager, monitoredNamespaces));
    
    return router;
}

export default profilesRoutes