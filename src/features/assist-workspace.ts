import { createFormulaRenderer } from './formula-renderer';
import { createFormulaPins } from './formula-pins';
import { watchFormulaLibrary } from './formula-store';

/** Page-owned references outlive the drawing/tools session. */
export function createAssistWorkspace() {
  const element = document.createElement('div');
  element.className = 'bmc-drawing-surface';
  document.body.append(element);
  let disposed = false;
  let references:
    | {
        renderer: ReturnType<typeof createFormulaRenderer>;
        pins: ReturnType<typeof createFormulaPins>;
      }
    | undefined;
  let unwatch: (() => void) | undefined;

  function layout(): void {
    if (disposed) return;
    const viewport = window.visualViewport;
    element.style.width = (viewport?.width ?? innerWidth) + 'px';
    element.style.height = (viewport?.height ?? innerHeight) + 'px';
    element.style.left = (viewport?.offsetLeft ?? 0) + 'px';
    element.style.top = (viewport?.offsetTop ?? 0) + 'px';
    references?.pins.layout();
  }
  window.addEventListener('resize', layout, { passive: true });
  window.visualViewport?.addEventListener('resize', layout, { passive: true });
  window.visualViewport?.addEventListener('scroll', layout, { passive: true });
  layout();

  return {
    element,
    layout,
    formulas() {
      if (!references) {
        const renderer = createFormulaRenderer();
        const pins = createFormulaPins(element, renderer);
        references = { renderer, pins };
        unwatch = watchFormulaLibrary(
          (library) => pins.refresh(library),
          // Keep the placed snapshot readable; the library UI handles load errors.
          () => {},
        );
      }
      return references;
    },
    dispose() {
      disposed = true;
      unwatch?.();
      references?.pins.dispose();
      references?.renderer.dispose();
      window.removeEventListener('resize', layout);
      window.visualViewport?.removeEventListener('resize', layout);
      window.visualViewport?.removeEventListener('scroll', layout);
      element.remove();
    },
  };
}
export type AssistWorkspace = ReturnType<typeof createAssistWorkspace>;
