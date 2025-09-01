import type { NamedSSRLoadedRendererValue } from "astro";
import type { DjotComponent } from "./vite-plugin-djot.js";

async function check(
  t: any,
  _Component: any,
  _props: Record<string, any>,
  children: any
) {
  return t?.name == "DjotComponent" && !children;
}

async function renderToStaticMarkup(t: DjotComponent, attrs: {}) {
  return { attrs, html: t.html };
}

const renderer: NamedSSRLoadedRendererValue = {
  name: "astro:djot",
  check,
  renderToStaticMarkup,
};

export default renderer;
