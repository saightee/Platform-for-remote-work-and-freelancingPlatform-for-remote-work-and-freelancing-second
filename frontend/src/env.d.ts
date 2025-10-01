/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SITE?: 'jobforge' | '22resumes'
  readonly VITE_BASE_URL?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_BASE_URL?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
