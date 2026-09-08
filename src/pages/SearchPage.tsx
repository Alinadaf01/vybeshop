import { Navigate, useLocation } from "react-router-dom";

// /search was a permanent "Coming Soon" placeholder -- confirmed live as
// exactly why the header/mobile-menu search entry points did nothing useful.
// /products already has a full, working search box (?q=, filters,
// pagination) via getProducts({ search }) -- redirect there instead of
// building and maintaining a second, parallel search UI.
export default function SearchPage() {
  const location = useLocation();
  return <Navigate to={`/products${location.search}`} replace />;
}
