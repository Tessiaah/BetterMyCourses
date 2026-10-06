import pencil from '@phosphor-icons/core/assets/regular/pencil-simple.svg?raw';
import { assistButton } from './assist-ui';
import { createAssistWorkspace } from './assist-workspace';
import { createDrawingSurface } from './drawing-surface';

/** One quiz-sidebar launcher. No native question content is read or modified. */
export function createStudyAssist() {
  let launcher: HTMLButtonElement | undefined;
  let observer: MutationObserver | undefined;
  let container: Element | null = null;
  let workspace: ReturnType<typeof createAssistWorkspace> | undefined;
  let tools: ReturnType<typeof createDrawingSurface> | undefined;
  let enabled = false;
  let accent = '#d8c3a0';
  let disposed = false;
  let queued = false;

  function closeTools(): void {
    tools?.dispose();
    tools = undefined;
    launcher?.setAttribute('aria-expanded', 'false');
  }
  function toggleTools(): void {
    if (tools) {
      closeTools();
      return;
    }
    const anchor = document.querySelector<HTMLElement>(
      '#region-main, #responseform',
    );
    if (!enabled || !anchor) return;
    workspace ??= createAssistWorkspace();
    launcher?.setAttribute('aria-expanded', 'true');
    tools = createDrawingSurface(
      anchor,
      () => {
        closeTools();
        launcher?.focus({ preventScroll: true });
      },
      accent,
      workspace,
    );
  }
  function reconcile(): void {
    if (!enabled || !container?.isConnected) return;
    const navigation = container.matches('#mod_quiz_navblock, .block_quiz_nav')
      ? container
      : container.querySelector(
          '#mod_quiz_navblock, .block_quiz_nav, .block:has(.qn_buttons)',
        );
    const host =
      navigation?.querySelector('.content') ??
      navigation?.querySelector('.card-body') ??
      navigation;
    if (!host) return;
    if (launcher && host.contains(launcher)) return;
    launcher?.remove();
    launcher = assistButton('Study Assist', pencil);
    launcher.className = 'bmc-study-assist';
    launcher.setAttribute('aria-expanded', String(Boolean(tools)));
    launcher.title =
      'Drawing tools and formula library. Placed formulas stay until you remove them.';
    launcher.addEventListener('click', toggleTools);
    host.append(launcher);
  }
  function start(): void {
    if (!enabled || disposed || observer || document.readyState === 'loading')
      return;
    if (!/^\/mod\/quiz\/(attempt|review)\.php$/.test(location.pathname)) return;
    const navigation = document.querySelector(
      '#mod_quiz_navblock, .block_quiz_nav, .block:has(.qn_buttons)',
    );
    const parent = navigation?.parentElement;
    container =
      document.querySelector(
        '#block-region-side-pre, #theme_boost-drawers-blocks',
      ) ??
      (parent && parent !== document.body && parent !== document.documentElement
        ? parent
        : navigation) ??
      null;
    if (!container) return;
    document.documentElement.dataset.bmcStudyAssist = 'on';
    reconcile();
    observer = new MutationObserver((records) => {
      if (
        queued ||
        records.every((record) =>
          [...record.addedNodes, ...record.removedNodes].every(
            (node) =>
              node instanceof Element && node.matches('.bmc-study-assist'),
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
    closeTools();
    workspace?.dispose();
    workspace = undefined;
    launcher?.remove();
    launcher = undefined;
    container = null;
    delete document.documentElement.dataset.bmcStudyAssist;
  }
  document.addEventListener('DOMContentLoaded', start);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', start);
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
      window.removeEventListener('pagehide', stop);
      window.removeEventListener('pageshow', start);
      stop();
    },
  };
}
