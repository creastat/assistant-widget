/// <reference types="vite/client" />

// Inline CSS import
declare module '*.css?inline' {
  const content: string;
  export default content;
}
