/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
