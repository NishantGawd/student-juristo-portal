export {};

declare global {
  interface Window {
    pyodideReady?: boolean;
  }
}