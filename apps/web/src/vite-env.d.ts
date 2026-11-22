/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_ES_DEMO?: string
  readonly VITE_DEMO_EMAIL?: string
  readonly VITE_DEMO_PASSWORD?: string
  readonly VITE_GOOGLE_HABILITADO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
