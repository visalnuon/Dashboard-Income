import { Navigate, useLocation } from "react-router-dom";
import { useIsMobile } from "../hooks/useMediaQuery";

/**
 * Keeps home experience aligned with viewport without trapping shared routes.
 * /dashboard ↔ /mobile only. Direct URLs and refresh still work.
 */
export function ExperienceRedirect() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();

  if (isMobile && pathname === "/dashboard") {
    return <Navigate to="/mobile" replace />;
  }
  if (!isMobile && (pathname === "/mobile" || pathname === "/mobile/")) {
    return <Navigate to="/dashboard" replace />;
  }
  return null;
}
