/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_ADAPTER: 'mock' | 'sharepoint' | 'dataverse'
  readonly VITE_ENTRA_CLIENT_ID: string
  readonly VITE_ENTRA_TENANT_ID: string
  readonly VITE_ENTRA_REDIRECT_URI: string
  readonly VITE_SP_SITE_ID: string
  readonly VITE_SP_LIST_DOCUMENTS: string
  readonly VITE_SP_LIST_SEGMENTS: string
  readonly VITE_SP_LIST_DECISIONS: string
  readonly VITE_SP_LIST_CONFIG: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
