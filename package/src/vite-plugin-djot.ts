import type { Plugin } from "vite";
import { renderToHTML } from "./djot.js";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import { shorthash } from "./shorthash.js";

export type DjotComponent = {
  name: "DjotComponent";
  frontmatter: Record<string, any>;
  file: string;
  html: string;
};

export type MarkdownImagePath = { raw: string; safeName: string };

export function getMarkdownCodeForImages(
  imagePaths: MarkdownImagePath[],
  html: string
) {
  return `
			import { getImage } from "astro:assets";
			${imagePaths
        .map(
          (entry) =>
            `import Astro__${entry.safeName} from ${JSON.stringify(entry.raw)};`
        )
        .join("\n")}

			const images = async function(html) {
					const imageSources = {};
					${imagePaths
            .map((entry) => {
              const rawUrl = JSON.stringify(entry.raw);
              return `{
											const regex = new RegExp('__ASTRO_IMAGE_="([^"]*' + ${rawUrl.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\\\$&"
                      )} + '[^"]*)"', 'g');
											let match;
											let occurrenceCounter = 0;
											while ((match = regex.exec(html)) !== null) {
													const matchKey = ${rawUrl} + '_' + occurrenceCounter;
													const imageProps = JSON.parse(match[1].replace(/&#x22;/g, '"'));
													const { src, ...props } = imageProps;
													imageSources[matchKey] = await getImage({src: Astro__${
                            entry.safeName
                          }, ...props});
													occurrenceCounter++;
											}
									}`;
            })
            .join("\n")}
					return imageSources;
			};

		async function updateImageReferences(html) {
			const imageSources = await images(html);

			return html.replaceAll(/__ASTRO_IMAGE_="([^"]+)"/gm, (full, imagePath) => {
				const decodedImagePath = JSON.parse(imagePath.replace(/&#x22;/g, '"'));

				// Use the 'index' property for each image occurrence
				const srcKey = decodedImagePath.src + '_' + decodedImagePath.index;

				if (imageSources[srcKey].srcSet && imageSources[srcKey].srcSet.values.length > 0) {
					imageSources[srcKey].attributes.srcset = imageSources[srcKey].srcSet.attribute;
				}

				const { index, ...attributesWithoutIndex } = imageSources[srcKey].attributes;

				return spreadAttributes({
					src: imageSources[srcKey].src,
					...attributesWithoutIndex,
				});
			});
		}

		const html = async () => await updateImageReferences(${JSON.stringify(html)});
	`;
}

export default function vitePluginDjot(): Plugin {
  return {
    name: "vite-plugin-djot",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (importer?.endsWith(".djot") && source[0] !== "/") {
        let resolved = await this.resolve(source, importer, options);
        if (!resolved)
          resolved = await this.resolve("./" + source, importer, options);
        return resolved;
      }
      return false;
    },
    async transform(code, id) {
      const fileId = id.split("?")[0];
      if (!id.endsWith(".djot") || fileId === undefined) return;

      const { frontmatter, content } = parseFrontmatter(code, {
        frontmatter: "empty-with-spaces",
      });

      const html = renderToHTML(content);
      // TODO frontmatter
      const layout = null;
      const headings: string[] = [];
      const rawImagePaths: string[] = [];

      const imagePaths: MarkdownImagePath[] = [];
      for (const imagePath of rawImagePaths) {
        imagePaths.push({
          raw: imagePath,
          safeName: shorthash(imagePath),
        });
      }

      const outputCode = `
      import { unescapeHTML, spreadAttributes, createComponent, render, renderComponent, maybeRenderHead } from "astro/runtime/server/index.js";
      ${layout ? `import Layout from ${JSON.stringify(layout)};` : ""}

      ${
        // Only include the code relevant to `astro:assets` if there's images in the file
        imagePaths.length > 0
          ? getMarkdownCodeForImages(imagePaths, html)
          : `const html = () => ${JSON.stringify(html)};`
      }

      export const frontmatter = ${JSON.stringify(frontmatter)};
      export const file = ${JSON.stringify(fileId)};
      export function rawContent() {
        return ${JSON.stringify(content)};
      }
      export async function compiledContent() {
        return await html();
      }
      export function getHeadings() {
        return ${JSON.stringify(headings)};
      }

      export const Content = createComponent(async (result, _props, slots) => {
        const { layout, ...content } = frontmatter;
        content.file = file;
        content.url = undefined;

        return ${
          layout
            ? `render\`\${renderComponent(result, 'Layout', Layout, {
              file,
              url: undefined,
              content,
              frontmatter: content,
              headings: getHeadings(),
              rawContent,
              compiledContent,
              'server:root': true,
            }, {
              'default': async () => render\`\${unescapeHTML(await html())}\`
            })}\`;`
            : `render\`<meta charset="utf-8">\${maybeRenderHead(result)}\${unescapeHTML(await html())}\`;`
        }
      });
      export default Content;
      `;

      return {
        code: outputCode,
      };
    },
  };
}
