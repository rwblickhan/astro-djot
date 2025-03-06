import tailwind from "@astrojs/tailwind";
import { createResolver } from "astro-integration-kit";
import { hmrIntegration } from "astro-integration-kit/dev";
import { defineConfig } from "astro/config";

const { default: djot } = await import("../package/src/index");

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind(),
    djot(),
    hmrIntegration({
      directory: createResolver(import.meta.url).resolve("../package/dist"),
    }),
  ],
});
