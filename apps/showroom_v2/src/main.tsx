  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import { ShowroomProvider } from "./app/data/ShowroomContext";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <ShowroomProvider>
      <App />
    </ShowroomProvider>
  );
