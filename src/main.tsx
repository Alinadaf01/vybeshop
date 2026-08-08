import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { router } from "@/app/router";
import { AppProviders } from "@/app/AppProviders";
import "@/index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
