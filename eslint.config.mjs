import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  {
    ignores: ["adr_reference/**", ".next/**", "node_modules/**"],
  },
  {
    extends: [...next],
  },
]);
