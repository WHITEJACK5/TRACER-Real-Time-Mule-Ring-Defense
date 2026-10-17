import { defineConfig } from "vitest/config";
import path from "node:path";

/** Vitest config - jsdom environment for component tests, `@/` path alias. */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
