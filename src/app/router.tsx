import { createBrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { DevComponentsPage } from "@/pages/dev/DevComponentsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/dev/components",
    element: <DevComponentsPage />,
  },
]);
