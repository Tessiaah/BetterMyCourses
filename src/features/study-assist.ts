import { createDrawingSurface } from './drawing-surface';

const DRAWER_CLASS = 'bmc-study-assist';

/** Optional drawing/formula workspace. No question text or released answers are read. */
export function createStudyAssist() {
  const drawers = new Map<Element, HTMLDetailsElement>();
  let observer: MutationObserver | undefined;
  let container: Element | null = null;
  let active: HTMLDetailsElement | undefined;
  let surface: ReturnType<typeof createDrawingSurface> | undefined;
  let enabled = false;
  let accent = '#d8c3a0';
  let disposed = false;
  let queued = false;

  function close(): void {
    surface?.dispose();
    surface = undefined;
    if (active) active.open = false;
    active = undefined;
  }

  function reconcile(): void {
    if (!enabled || !container?.isConnected) {
      close();
      return;
    }
    for (const [question, drawer] of drawers) {
      if (!container.contains(question) || !question.contains(drawer)) {
        if (active === drawer) close();
        drawer.remove();
        drawers.delete(question);
      }
    }
    for (const question of container.querySelectorAll<HTMLElement>('.que')) {
      if (question.parentElement?.closest('.que')) continue;
      const content = question.querySelector(':scope > .content');
      if (!content?.querySelector(':scope > .formulation')) continue;
      if (drawers.has(question)) continue;
      const drawer = document.createElement('details');
      drawer.className = DRAWER_CLASS;
      const summary = document.createElement('summary');
      summary.textContent = 'Study Assist';
      const note = document.createElement('p');
      note.textContent =
        'Draw or place formulas over the page. Closing clears drawings and cards; your formula library stays saved.';
      drawer.append(summary, note);
      drawer.addEventListener('toggle', () => {
        if (!enabled || !drawer.isConnected) return;
        if (!drawer.open) {
          if (active === drawer) close();
          return;
        }
        if (active === drawer) return;
        close();
        active = drawer;
        surface = createDrawingSurface(
          question,
          () => {
            close();
            summary.focus({ preventScroll: true });
          },
          accent,
        );
      });
      content.append(drawer);
      drawers.set(question, drawer);
    }
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
      // Watch structure only. Grading text, answer values and pixels are unused.
      if (
        queued ||
        records.every((record) =>
          [...record.addedNodes, ...record.removedNodes].every(
            (node) =>
              node instanceof Element && node.matches('.' + DRAWER_CLASS),
          ),
        )
      )
        return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        reconcile();
      });
    });
    observer.observe(container, { childList: true, subtree: true });
  }

  function stop(): void {
    observer?.disconnect();
    observer = undefined;
    close();
    for (const drawer of drawers.values()) drawer.remove();
    drawers.clear();
    container = null;
    delete document.documentElement.dataset.bmcStudyAssist;
  }

  document.addEventListener('DOMContentLoaded', start);
  return {
    update(value: boolean, linkColor: string) {
      if (disposed) return;
      accent = linkColor;
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
