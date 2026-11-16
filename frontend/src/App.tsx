// Mapa de rutas de la app. Público (móvil) y admin (escritorio, protegido).
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout, PublicLayout } from './components/Layouts'
import { RequireAuth } from './auth/RequireAuth'
import { GoalsListPage } from './pages/public/GoalsListPage'
import { GoalDetailPage } from './pages/public/GoalDetailPage'
import { ContributePage } from './pages/public/ContributePage'
import { PaymentPage } from './pages/public/PaymentPage'
import { FaqPage, HowItWorksPage } from './pages/public/InfoPages'
import { ContributionsPage } from './pages/admin/ContributionsPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { LoginPage, RegisterPage } from './pages/admin/LoginPage'
import { LandingPage } from './pages/public/LandingPage'
import { AdminGoalsPage } from './pages/admin/AdminGoalsPage'
import { GoalFormPage } from './pages/admin/GoalFormPage'
import { GoalProgressPage } from './pages/admin/GoalProgressPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="metas" element={<GoalsListPage />} />
        <Route path="metas/:id" element={<GoalDetailPage />} />
        <Route path="metas/:id/aportar" element={<ContributePage />} />
        <Route path="como-funciona" element={<HowItWorksPage />} />
        <Route path="preguntas-frecuentes" element={<FaqPage />} />
      </Route>
      {/* La pantalla de pago usa una columna más ancha en escritorio (QR grande + instrucciones). */}
      <Route element={<PublicLayout />}>
        <Route path="pago/:numRef" element={<PaymentPage />} />
      </Route>

      <Route path="admin/login" element={<LoginPage />} />
      <Route path="admin/registro" element={<RegisterPage />} />
      <Route path="registro" element={<Navigate to="/admin/registro" replace />} />
      <Route path="login" element={<Navigate to="/admin/login" replace />} />
      <Route
        path="admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminGoalsPage />} />
        <Route path="metas/nueva" element={<GoalFormPage />} />
        <Route path="metas/:id" element={<GoalProgressPage />} />
        <Route path="metas/:id/editar" element={<GoalFormPage />} />
        <Route path="aportaciones" element={<ContributionsPage />} />
        <Route path="configuracion" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
