import fs from "node:fs/promises";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import type { AstroIntegration, ContentEntryType, HookParameters } from "astro";
import vitePluginDjot from "./vite-plugin-djot.js";

type SetupHookParams = HookParameters<"astro:config:setup"> & {
  addPageExtension: (extension: string) => void;
  addContentEntryType: (contentEntryType: ContentEntryType) => void;
};

export const djot: () => AstroIntegration = () => {
  return {
    name: "astro-djot",
    hooks: {
      "astro:config:setup": async (params) => {
        const {
          updateConfig,
          addPageExtension,
          addContentEntryType,
          addRenderer,
        } = params as SetupHookParams;

        addRenderer({
          name: "astro:djot",
          serverEntrypoint: new URL(
            "../dist/server.js",
            import.meta.url
          ).toString(),
        });
        addPageExtension(".djot");
        addContentEntryType({
          extensions: [".djot"],
          async getEntryInfo({ contents }: { contents: string }) {
            const parsed = parseFrontmatter(contents, {
              frontmatter: "empty-with-spaces",
            });
            return {
              data: parsed.frontmatter,
              body: parsed.content.trim(),
              slug: parsed.frontmatter.slug,
              rawData: parsed.rawFrontmatter,
            };
          },
          contentModuleTypes: await fs.readFile(
            new URL("../src/content-module-types.d.ts", import.meta.url),
            "utf-8"
          ),
          handlePropagation: false,
        });

        updateConfig({
          vite: {
            plugins: [vitePluginDjot()],
          },
        });
      },
    },
  };
};
