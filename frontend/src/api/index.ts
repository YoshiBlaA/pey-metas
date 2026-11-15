// Punto único de entrada a la API: elige la implementación real o los mocks
// según VITE_USE_MOCKS. El resto de la app SOLO importa desde aquí.
import { USE_MOCKS } from './client'
import { realPublicApi, type PublicApi } from './publicApi'
import { realAdminApi, type AdminApi } from './adminApi'
import { mockPublicApi, mockAdminApi } from './mocks'

export const publicApi: PublicApi = USE_MOCKS ? mockPublicApi : realPublicApi
export const adminApi: AdminApi = USE_MOCKS ? mockAdminApi : realAdminApi

export { ApiError, errorMessage, USE_MOCKS, configureAuth } from './client'
export * from './types'
