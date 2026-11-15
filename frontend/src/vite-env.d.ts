/// <reference types="vite/client" />

// Tipamos nuestras variables de entorno para tener autocompletado.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_USE_MOCKS?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
