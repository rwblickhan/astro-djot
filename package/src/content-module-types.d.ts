declare module "astro:content" {
  interface Render {
    ".djot": Promise<{
      Content: import("astro").MarkdownInstance<{}>["Content"];
      headings: import("astro").MarkdownHeading[];
      remarkPluginFrontmatter: Record<string, any>;
      components: import("astro").MDXInstance<{}>["components"];
    }>;
  }
}
