import { createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "@/app/AdminLayout";
import { RequireStaffAuth } from "@/app/RequireStaffAuth";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import OrdersPage from "@/pages/OrdersPage";
import ProductsPage from "@/pages/ProductsPage";
import PricingPage from "@/pages/PricingPage";
import CategoriesPage from "@/pages/CategoriesPage";
import SpecsPage from "@/pages/SpecsPage";
import InventoryPage from "@/pages/InventoryPage";
import StockLedgerPage from "@/pages/StockLedgerPage";
import UsersPage from "@/pages/UsersPage";
import MessagesPage from "@/pages/MessagesPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import ReviewsPage from "@/pages/ReviewsPage";
import BlogPage from "@/pages/BlogPage";
import CouponsPage from "@/pages/CouponsPage";
import ReturnsPage from "@/pages/ReturnsPage";
import SearchConsolePage from "@/pages/SearchConsolePage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import NotFoundPage from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireStaffAuth />,
    children: [
      {
        path: "/",
        element: <AdminLayout />,
        errorElement: <NotFoundPage />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "products", element: <ProductsPage /> },
          { path: "pricing", element: <PricingPage /> },
          { path: "categories", element: <CategoriesPage /> },
          { path: "specs", element: <SpecsPage /> },
          { path: "inventory", element: <InventoryPage /> },
          { path: "stock-ledger", element: <StockLedgerPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "messages", element: <MessagesPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "reviews", element: <ReviewsPage /> },
          { path: "blog", element: <BlogPage /> },
          { path: "coupons", element: <CouponsPage /> },
          { path: "returns", element: <ReturnsPage /> },
          { path: "search-console", element: <SearchConsolePage /> },
          { path: "activity-log", element: <ActivityLogPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
