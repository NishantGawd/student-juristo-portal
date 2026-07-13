"use client";

import Script from "next/script";

export function PyodideLoader() {
  return (
    <Script
      src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
      strategy="lazyOnload"
      onLoad={() => {
        window.pyodideReady = true;
      }}
    />
  );
}