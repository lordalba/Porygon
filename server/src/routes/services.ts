import { Router } from "express";
import { getServices, handleSyncService, updateTestingStatus } from "../controllers/servicesController";
import WebSocketManager from '../websockets/websocketServer';

const createServicesRouter = (websocketManager: WebSocketManager) => {
    const router = Router();
  
    router.post("/", getServices);
    router.post("/update-testing", updateTestingStatus);
    router.post("/sync", (req, res) => handleSyncService(req, res, websocketManager)); // Pass WebSocketManager here
  
    return router;
  };

export default createServicesRouter;
