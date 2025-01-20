import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./index.css";
import "./style.css";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import socketClient from "./websockets/websocketClient";

const app = createApp(App);

app.use(Toast, {
  // Options (optional, defaults shown below)
  position: "top-right",
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false,
});

socketClient.connect("ws://localhost:3000");

app.use(router); // Add the router to the app
app.mount("#app");

export default socketClient;
