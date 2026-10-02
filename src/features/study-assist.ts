const DRAWER_CLASS = 'bmc-study-assist';
const FEEDBACK_SCOPE = ':scope > .content > .outcome > .feedback';
const STATIC_TAGS = new Set([
  'p',
  'div',
  'span',
  'strong',
  'b',
  'em',
  'i',
  'code',
  'pre',
  'br',
  'sub',
  'sup',
  'ul',
  'ol',
  'li',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);
const OMIT_TAGS = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'input',
  'select',
  'textarea',
  'button',
  'iframe',
  'object',
  'embed',
  'canvas',
  'svg',
  'annotation',
  'annotation-xml',
]);
const MATH_TAGS = new Set([
  'math',
  'mrow',
  'mi',
  'mn',
  'mo',
  'mtext',
  'mfrac',
  'msup',
  'msub',
  'msubsup',
  'msqrt',
  'mroot',
  'munder',
  'mover',
  'munderover',
  'mtable',
  'mtr',
  'mtd',
  'mstyle',
  'mspace',
  'menclose',
  'mmultiscripts',
  'mprescripts',
  'none',
]);
const MATH_ATTRIBUTES = [
  'display',
  'mathvariant',
  'stretchy',
  'fence',
  'separator',
  'columnalign',
  'rowalign',
  'notation',
  'linethickness',
];

function hidden(element: Element): boolean {
  const style = getComputedStyle(element);
  return (
    element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden') === 'true' ||
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse' ||
    style.contentVisibility === 'hidden' ||
    style.opacity === '0'
  );
}

function released(element: Element): boolean {
  for (
    let parent: Element | null = element;
    parent;
    parent = parent.parentElement
  ) {
    if (hidden(parent)) return false;
    if (parent.matches('details:not([open])')) return false;
  }
  return element.getClientRects().length > 0;
}

// Copy presentation only: no IDs, handlers, controls, styles or network assets.
// Accessible MathML belonging to a visible MathJax formula preserves fractions.
function copyMath(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE)
    return document.createTextNode(node.textContent ?? '');
  if (!(node instanceof Element)) return null;
  const tag = node.localName.toLowerCase();
  if (OMIT_TAGS.has(tag)) return null;
  const target = MATH_TAGS.has(tag)
    ? document.createElementNS('http://www.w3.org/1998/Math/MathML', tag)
    : document.createDocumentFragment();
  if (target instanceof Element) {
    for (const attribute of MATH_ATTRIBUTES) {
      const value = node.getAttribute(attribute);
      if (value !== null) target.setAttribute(attribute, value);
    }
  }
  for (const child of node.childNodes) {
    const copy = copyMath(child);
    if (copy) target.appendChild(copy);
  }
  return target;
}

function copyStatic(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE)
    return document.createTextNode(node.textContent ?? '');
  if (!(node instanceof Element) || hidden(node)) return null;
  const tag = node.localName.toLowerCase();
  if (['img', 'svg', 'object', 'canvas'].includes(tag))
    return document.createTextNode(' [Image in original feedback] ');
  if (OMIT_TAGS.has(tag)) return null;
  if (tag === 'math') return copyMath(node);
  if (
    node.matches('mjx-container, .MathJax, .MathJax_Display, .MathJax_CHTML')
  ) {
    const math = node.querySelector('math');
    if (math) return copyMath(math);
  }
  const target = STATIC_TAGS.has(tag)
    ? document.createElement(tag)
    : document.createDocumentFragment();
  const children = node.matches('details:not([open])')
    ? node.querySelectorAll(':scope > summary')
    : node.childNodes;
  for (const child of children) {
    const copy = copyStatic(child);
    if (copy) target.appendChild(copy);
  }
  return target;
}

function project(sources: Element[]): { source: Element; content: Node }[] {
  return sources.flatMap((source) => {
    if (!released(source)) return [];
    const content = copyStatic(source);
    return content?.textContent?.trim() ? [{ source, content }] : [];
  });
}

function readFeedback(question: Element) {
  const answers = project([
    ...question.querySelectorAll(`${FEEDBACK_SCOPE} .rightanswer`),
  ]);
  const feedback = project(
    [
      ...question.querySelectorAll(
        `${FEEDBACK_SCOPE} :is(.specificfeedback, .generalfeedback, .hint), ` +
          ':scope > .content > .formulation .stackprtfeedback',
      ),
    ].filter(
      (source, index, sources) =>
        !sources.some(
          (other, otherIndex) => index !== otherIndex && other.contains(source),
        ),
    ),
  );
  return { answers, feedback };
}

function refresh(question: Element, body: HTMLElement): void {
  const { answers, feedback } = readFeedback(question);
  const next = document.createElement('div');
  const intro = document.createElement('p');
  intro.className = 'bmc-study-assist-note';
  intro.textContent = answers.length
    ? 'Correct answer released by MyCourses. Compare it with your work.'
    : 'MyCourses has not released a correct answer for this question. It may become available after checking or during review, depending on the quiz settings.';
  next.append(intro);
  for (const [title, entries] of [
    ['Correct answer', answers],
    ['Feedback and hints', feedback],
  ] as const) {
    if (!entries.length) continue;
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading);
    for (const entry of entries) {
      const content = document.createElement('div');
      content.className = 'bmc-study-assist-copy';
      content.append(entry.content);
      section.append(content);
    }
    next.append(section);
  }
  const original = answers[0]?.source ?? feedback[0]?.source;
  if (original) {
    const view = document.createElement('button');
    view.type = 'button';
    view.className = 'bmc-study-assist-original btn btn-secondary';
    view.textContent = 'View original feedback';
    view.addEventListener('click', () => {
      const current = readFeedback(question);
      const source = current.answers[0]?.source ?? current.feedback[0]?.source;
      source?.scrollIntoView({ block: 'center' });
    });
    next.append(view);
  }
  // Retain focus and disclosure content when unrelated quiz markup changes.
  if (body.innerHTML !== next.innerHTML)
    body.replaceChildren(...next.childNodes);
}

/** Opt-in, local projection of released feedback. Never requests or solves answers. */
export function createStudyAssist() {
  const drawers = new Map<Element, HTMLDetailsElement>();
  let observer: MutationObserver | undefined;
  let container: Element | null = null;
  let enabled = false;
  let disposed = false;
  let queued = false;

  function reconcile(): void {
    if (!enabled || !container?.isConnected) return;
    for (const [question, drawer] of drawers) {
      if (!container.contains(question)) {
        drawer.remove();
        drawers.delete(question);
      }
    }
    for (const question of container.querySelectorAll('.que')) {
      if (question.parentElement?.closest('.que')) continue;
      const content = question.querySelector(':scope > .content');
      if (!content?.querySelector(':scope > .formulation')) continue;
      let drawer = drawers.get(question);
      if (!drawer || drawer.parentElement !== content) {
        drawer?.remove();
        drawer = document.createElement('details');
        drawer.className = DRAWER_CLASS;
        const summary = document.createElement('summary');
        summary.textContent = 'Study Assist';
        const body = document.createElement('div');
        body.className = 'bmc-study-assist-body';
        drawer.append(summary, body);
        drawer.addEventListener('toggle', () => {
          if (enabled && drawer?.open) refresh(question, body);
        });
        content.append(drawer);
        drawers.set(question, drawer);
      }
      if (drawer.open)
        refresh(question, drawer.lastElementChild as HTMLElement);
    }
  }

  function schedule(): void {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      reconcile();
    });
  }

  function start(): void {
    if (!enabled || disposed || observer || document.readyState === 'loading')
      return;
    if (!/^\/mod\/quiz\/(attempt|review)\.php$/.test(location.pathname)) return;
    container =
      document.querySelector('#responseform') ??
      document.querySelector('#region-main');
    if (!container) return;
    document.documentElement.dataset.bmcStudyAssist = 'on';
    reconcile();
    observer = new MutationObserver((records) => {
      const external = records.some((record) => {
        const target =
          record.target instanceof Element
            ? record.target
            : record.target.parentElement;
        if (target?.closest('.' + DRAWER_CLASS)) return false;
        if (record.type !== 'childList') return true;
        return [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            !(node instanceof Element && node.matches('.' + DRAWER_CLASS)),
        );
      });
      if (external) schedule();
    });
    // Only the quiz form/main region is observed while explicitly enabled.
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'aria-hidden', 'style', 'open'],
    });
  }

  function stop(): void {
    observer?.disconnect();
    observer = undefined;
    for (const drawer of drawers.values()) drawer.remove();
    drawers.clear();
    container = null;
    delete document.documentElement.dataset.bmcStudyAssist;
  }

  document.addEventListener('DOMContentLoaded', start);
  return {
    update(value: boolean) {
      if (disposed) return;
      enabled = value;
      if (enabled) start();
      else stop();
    },
    dispose() {
      disposed = true;
      enabled = false;
      document.removeEventListener('DOMContentLoaded', start);
      stop();
    },
  };
}
