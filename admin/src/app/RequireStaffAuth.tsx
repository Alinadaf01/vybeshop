import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/lib/AdminAuthContext";

/** Every panel route sits behind this — redirect to /login on no session,
 * same rule as a 401 mid-session (see api.ts's authorizedFetch, which clears
 * storage on a failed refresh; the next render here catches that). */
export function RequireStaffAuth() {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
