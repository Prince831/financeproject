/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_API_URL?: string; // Deprecated, use VITE_API_BASE_URL
    // Add other env variables here if needed
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  