import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastStack } from "./components/ToastStack";
import { AuthProvider } from "./hooks/useAuth";
import { LanguageProvider } from "./hooks/useLanguage";
import { ThemeProvider } from "./hooks/useTheme";
import { ToastProvider } from "./hooks/useToast";
import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { MobileLayout } from "./layouts/MobileLayout";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { AccountsPage } from "./pages/AccountsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HelpPage } from "./pages/HelpPage";
import { LoginPage } from "./pages/LoginPage";
import { MorePage } from "./pages/MorePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ExpensesPage, IncomePage } from "./pages/TransactionsPage";
import { MobileAccountsPage } from "./pages/mobile/MobileAccountsPage";
import { MobileActivityPage } from "./pages/mobile/MobileActivityPage";
import { MobileBudgetPage } from "./pages/mobile/MobileBudgetPage";
import { MobileGoalsPage } from "./pages/mobile/MobileGoalsPage";
import { MobileHomePage } from "./pages/mobile/MobileHomePage";
import { MobileMorePage } from "./pages/mobile/MobileMorePage";
import { MobileTransferPage } from "./pages/mobile/MobileTransferPage";
import { preferredHomePath } from "./hooks/useMediaQuery";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<MobileLayout />}>
          <Route path="/mobile" element={<MobileHomePage />} />
          <Route path="/mobile/activity" element={<MobileActivityPage />} />
          <Route path="/mobile/transfer" element={<MobileTransferPage />} />
          <Route path="/mobile/goals" element={<MobileGoalsPage />} />
          <Route path="/mobile/more" element={<MobileMorePage />} />
          <Route path="/mobile/accounts" element={<MobileAccountsPage />} />
          <Route path="/mobile/budget" element={<MobileBudgetPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/more" element={<MorePage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={preferredHomePath()} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
              <ToastStack />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
