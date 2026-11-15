// Mapa de rutas de la app. Público (móvil) y admin (escritorio, protegido).
import { Route, Routes } from 'react-router-dom'
import { AdminLayout, PublicLayout } from './components/Layouts'
import { RequireAuth } from './auth/RequireAuth'
import { GoalsListPage } from './pages/public/GoalsListPage'
import { GoalDetailPage } from './pages/public/GoalDetailPage'
import { ContributePage } from './pages/public/ContributePage'
import { PaymentPage } from './pages/public/PaymentPage'
import { LoginPage } from './pages/admin/LoginPage'
import { AdminGoalsPage } from './pages/admin/AdminGoalsPage'
import { GoalFormPage } from './pages/admin/GoalFormPage'
import { GoalProgressPage } from './pages/admin/GoalProgressPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<GoalsListPage />} />
        <Route path="metas/:id" element={<GoalDetailPage />} />
        <Route path="metas/:id/aportar" element={<ContributePage />} />
        <Route path="pago/:numRef" element={<PaymentPage />} />
      </Route>

      <Route path="admin/login" element={<LoginPage />} />
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
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
