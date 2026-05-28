import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import routes from "./routes";
import { AuthProvider } from "@/shared/context/AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/sonner";

function AppLayout() {
  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      <main className="min-h-[calc(100vh-3.5rem)]">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={route.element}
                />
              ))}
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;