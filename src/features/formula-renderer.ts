import katex from 'katex';
import css from 'katex/dist/katex.css?raw';
import { browser } from 'wxt/browser';
import { FORMULA_LIMITS } from './formula-model';

const options = {
  displayMode: true,
  throwOnError: true,
  trust: false,
  strict: 'error',
  output: 'htmlAndMathml',
  maxExpand: 1000,
  maxSize: 10,
} as const;

export function validateLatex(latex: string): string | null {
  if (!latex.trim()) return 'Enter a LaTeX formula.';
  if (latex.length > FORMULA_LIMITS.latex) return 'Use up to 2048 characters.';
  try {
    const rendered = katex.renderToString(latex, options);
    // trust:false marks rejected URL/HTML commands red rather than throwing.
    if (
      rendered.includes('katex-error') ||
      /\\(?:includegraphics|href|url|html\w+)\b/.test(latex)
    )
      return 'Use math LaTeX only; links, images and HTML commands are not supported.';
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message.replace(/^KaTeX parse error:\s*/, '')
      : 'Check the LaTeX syntax.';
  }
}

/** Scoped math typesetting: no native site math/classes/fonts are changed. */
export function createFormulaRenderer() {
  const faces: FontFace[] = [];
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(
    css
      .replace(/@font-face\s*\{[^}]+\}/g, '')
      .replace(/KaTeX_/g, 'BMC_KaTeX_') +
      '.katex-display{margin:0;text-align:left}.katex{color:inherit}',
  );
  let registered = false;
  function register(): void {
    if (registered) return;
    registered = true;
    for (const match of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
      const block = match[1]!;
      const family = /font-family:\s*"([^"]+)"/.exec(block)?.[1];
      const file = /url\(fonts\/([^()]+\.woff2)\)/.exec(block)?.[1];
      if (!family || !file) continue;
      const face = new FontFace(
        family.replace('KaTeX_', 'BMC_KaTeX_'),
        'url("' + browser.runtime.getURL('/') + 'fonts/katex/' + file + '")',
        {
          weight: /font-weight:\s*([^;]+);/.exec(block)?.[1] ?? 'normal',
          style: /font-style:\s*([^;]+);/.exec(block)?.[1] ?? 'normal',
          display: 'swap',
        },
      );
      document.fonts.add(face);
      faces.push(face);
    }
  }
  return {
    render(host: HTMLElement, latex: string): string | null {
      const error = validateLatex(latex);
      const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
      root.adoptedStyleSheets = [sheet];
      root.replaceChildren();
      if (error) {
        host.setAttribute('data-formula-error', 'true');
        return error;
      }
      host.removeAttribute('data-formula-error');
      register();
      const content = document.createElement('div');
      root.append(content);
      katex.render(latex, content, options);
      return null;
    },
    dispose() {
      for (const face of faces) document.fonts.delete(face);
      faces.length = 0;
      registered = false;
    },
  };
}
export type FormulaRenderer = ReturnType<typeof createFormulaRenderer>;
