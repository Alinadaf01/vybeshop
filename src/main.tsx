import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, hydrate, type DehydratedState } from "@tanstack/react-query";
import { router } from "@/app/router";
import { AppProviders } from "@/app/AppProviders";
import "@/index.css";

declare global {
  interface Window {
    __REACT_QUERY_STATE__?: DehydratedState;
  }
}

const queryClient = new QueryClient();

// Prerendered pages (see src/entry-server.tsx) embed a snapshot of the
// queries their page component needs — absorbing it here means those
// queries resolve from cache immediately on mount instead of showing a
// loading skeleton and then popping in data a moment later.
if (window.__REACT_QUERY_STATE__) {
  hydrate(queryClient, window.__REACT_QUERY_STATE__);
  delete window.__REACT_QUERY_STATE__;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
