import * as djot from "@djot/djot";

export function renderToHTML(content: string) {
  const ast = djot.parse(content);
  return djot.renderHTML(ast);
}
