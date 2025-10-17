import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ClientsPage from "./pages/ClientsPage";
import NotarizationsPage from "./pages/NotarizationsPage";
import ProfilePage from "./pages/ProfilePage";
import OrdersPage from "./pages/OrdersPage";
import BankAccountsPage from "./pages/BankAccountsPage";
import IncomePage from "./pages/IncomePage";
import ExpensesPage from "./pages/ExpensesPage";
import NotaryCredentialsPage from "./pages/NotaryCredentialsPage";
import PricingPage from "./pages/PricingPage";
import ManageSubscriptionPage from "./pages/ManageSubscriptionPage";
import ReportsPage from "./pages/ReportsPage";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import ClientDetailsPage from "./pages/ClientDetailsPage";
import UserManagementPage from "./pages/UserManagementPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminSalesReportsPage from "./pages/AdminSalesReportsPage"; // New import
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import { SessionContextProvider, useSession } from "./contexts/SessionContext";
import React from "react";

const queryClient = new QueryClient();

// ProtectedRoute component to guard routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading application...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Index />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:clientId" element={<ClientDetailsPage />} />
              <Route path="/notarizations" element={<NotarizationsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/bank-accounts" element={<BankAccountsPage />} />
              <Route path="/income" element={<IncomePage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/notary-credentials" element={<NotaryCredentialsPage />} />
              <Route path="/manage-subscription" element={<ManageSubscriptionPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/user-management" element={<UserManagementPage />} />
              <Route
                path="/admin-dashboard"
                element={
                  <AdminProtectedRoute>
                    <AdminDashboardPage />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin-sales-reports"
                element={
                  <AdminProtectedRoute>
                    <AdminSalesReportsPage />
                  </AdminProtectedRoute>
                }
              /> {/* New Admin Sales Reports Route */}
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;