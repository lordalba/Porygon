import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import profilesRoutes from "./routes/profiles";
import createServicesRouter from "./routes/services";
import http from "http";
import WebSocketManager from "./websockets/websocketServer";
// import { monitorOpenShiftChangesWithWatch } from "./utils/openshiftPoller"; // Poller service for OpenShift updates
import { profiles } from "./models/profile";

const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

const server = http.createServer(app);

// Initialize WebSocket server
const websocketManager = new WebSocketManager(server);

let monitoredNamespaces = new Set<string>();

// Monitor existing profilesmonitorOpenShiftChanges
// profiles.forEach(({ saToken, clusterUrl }) => {
//   monitorOpenShiftChangesWithWatch(saToken, clusterUrl, websocketManager);
// });

app.get("/", (req, res) => {
  res.send("WebSocket server is running!");
});

app.use("/api/profiles", profilesRoutes(websocketManager, monitoredNamespaces));
app.use("/api/services", createServicesRouter(websocketManager));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
