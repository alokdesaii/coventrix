import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Mock API functions keep their real signatures; `_`-prefixed params are intentionally unused.
    rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
