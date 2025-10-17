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
import Layout from "./components/Layout"; // Import the new Layout component
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
      {/* Removed shadcn/ui Toaster, now only using Sonner */}
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Protected routes nested under the Layout component */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/notarizations" element={<NotarizationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/orders" element={<OrdersPage />} />
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