import { Layout, PublicLayout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import AdminPage from "@/pages/AdminPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import CapaPage from "@/pages/CapaPage";
import DashboardPage from "@/pages/DashboardPage";
import ESGPage from "@/pages/ESGPage";
import EnvironmentPage from "@/pages/EnvironmentPage";
import IncidentsPage from "@/pages/IncidentsPage";
import InspectionsPage from "@/pages/InspectionsPage";
import LoginPage from "@/pages/LoginPage";
import ObservationsPage from "@/pages/ObservationsPage";
import PermitsPage from "@/pages/PermitsPage";
import PublicPermitScanPage from "@/pages/PublicPermitScanPage";
import RiskAssessmentPage from "@/pages/RiskAssessmentPage";
import TrainingPage from "@/pages/TrainingPage";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/permit-scan" element={<PublicPermitScanPage />} />
            </Route>
            {/* Protected routes */}
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/permits" element={<PermitsPage />} />
              <Route path="/risk-assessment" element={<RiskAssessmentPage />} />
              <Route path="/inspections" element={<InspectionsPage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/environment" element={<EnvironmentPage />} />
              <Route path="/esg" element={<ESGPage />} />
              <Route path="/capa" element={<CapaPage />} />
              <Route path="/observations" element={<ObservationsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
