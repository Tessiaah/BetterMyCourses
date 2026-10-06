import moveIcon from '@phosphor-icons/core/assets/regular/arrows-out-cardinal.svg?raw';
import x from '@phosphor-icons/core/assets/regular/x.svg?raw';
import { assistButton } from './assist-ui';
import { validateLatex, type FormulaRenderer } from './formula-renderer';
import type { Formula, FormulaLibrary, Subject } from './formula-model';

export function createFormulaPins(
  root: HTMLElement,
  renderer: FormulaRenderer,
) {
  const pins = new Map<
    string,
    {
      element: HTMLElement;
      handle: HTMLButtonElement;
      math: HTMLElement;
      subject: HTMLElement;
      x: number;
      y: number;
      latex: string;
    }
  >();
  let disposed = false;
  const resize = new ResizeObserver(layout);

  function layout(): void {
    const bounds = root.getBoundingClientRect();
    const toolbar = root
      .querySelector('.bmc-drawing-tools')
      ?.getBoundingClientRect();
    for (const pin of pins.values()) {
      const box = pin.element.getBoundingClientRect();
      pin.x = Math.max(
        8,
        Math.min(pin.x, Math.max(8, bounds.width - box.width - 8)),
      );
      pin.y = Math.max(
        8,
        Math.min(pin.y, Math.max(8, bounds.height - box.height - 8)),
      );
      // Keep the move/remove header reachable rather than behind the toolbar.
      if (
        toolbar &&
        pin.x + box.width > toolbar.left - bounds.left &&
        pin.x < toolbar.right - bounds.left
      ) {
        const available = toolbar.top - bounds.top - 16;
        const maxY =
          available >= box.height ? available - box.height : available - 44;
        pin.y = Math.max(8, Math.min(pin.y, maxY));
      }
      pin.element.style.left = pin.x + 'px';
      pin.element.style.top = pin.y + 'px';
    }
  }
  function remove(id: string): void {
    const pin = pins.get(id);
    if (pin) {
      resize.unobserve(pin.element);
      pin.element.remove();
    }
    pins.delete(id);
  }
  return {
    add(formula: Formula, subject: Subject): string | null {
      if (disposed) return null;
      const error = validateLatex(formula.latex);
      if (error) return error;
      const existing = pins.get(formula.id);
      if (existing) {
        root.append(existing.element);
        existing.handle.focus({ preventScroll: true });
        return null;
      }
      if (pins.size >= 8)
        return 'Up to eight formulas can be on screen. Remove one to place another.';
      const element = document.createElement('section');
      element.className = 'bmc-formula-card';
      element.setAttribute('aria-label', formula.title + ' reference');
      const header = document.createElement('div');
      header.className = 'bmc-formula-card-header';
      const handle = assistButton(formula.title, moveIcon);
      handle.className = 'bmc-formula-handle';
      handle.setAttribute('aria-label', 'Move ' + formula.title);
      handle.title = 'Drag to move, or use arrow keys. Shift moves one pixel.';
      const close = assistButton('', x);
      close.className = 'bmc-formula-remove';
      close.setAttribute(
        'aria-label',
        'Remove ' + formula.title + ' from screen',
      );
      close.title = 'Remove from screen';
      close.addEventListener('click', () => remove(formula.id));
      header.append(handle, close);
      const subjectLabel = document.createElement('p');
      subjectLabel.className = 'bmc-formula-card-subject';
      subjectLabel.textContent = subject.name;
      const math = document.createElement('div');
      math.className = 'bmc-formula-math';
      renderer.render(math, formula.latex);
      element.append(header, subjectLabel, math);
      const pin = {
        element,
        handle,
        math,
        subject: subjectLabel,
        x: 24 + pins.size * 24,
        y: 24 + pins.size * 28,
        latex: formula.latex,
      };
      pins.set(formula.id, pin);
      root.append(element);
      resize.observe(element);
      let pointer: number | undefined;
      let lastX = 0;
      let lastY = 0;
      handle.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        root.append(element);
        handle.focus({ preventScroll: true });
        pointer = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        handle.setPointerCapture(pointer);
      });
      handle.addEventListener('pointermove', (event) => {
        if (pointer !== event.pointerId) return;
        pin.x += event.clientX - lastX;
        pin.y += event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        layout();
      });
      for (const eventName of [
        'pointerup',
        'pointercancel',
        'lostpointercapture',
      ])
        handle.addEventListener(eventName, (event) => {
          if ((event as PointerEvent).pointerId !== pointer) return;
          const current = pointer;
          pointer = undefined;
          if (current !== undefined && handle.hasPointerCapture(current))
            handle.releasePointerCapture(current);
        });
      handle.addEventListener('keydown', (event) => {
        const direction = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        }[event.key];
        if (!direction) return;
        event.preventDefault();
        const step = event.shiftKey ? 1 : 10;
        pin.x += direction[0]! * step;
        pin.y += direction[1]! * step;
        layout();
      });
      layout();
      handle.focus({ preventScroll: true });
      return null;
    },
    refresh(library: FormulaLibrary): void {
      for (const [id, pin] of pins) {
        const formula = library.formulas.find((f) => f.id === id);
        const subject = library.subjects.find(
          (s) => s.id === formula?.subjectId,
        );
        if (!formula || !subject) {
          // A placed reference is the student's snapshot until its X is used.
          continue;
        }
        const text = pin.handle.lastChild;
        if (text) text.textContent = formula.title;
        pin.handle.setAttribute('aria-label', 'Move ' + formula.title);
        pin.element.setAttribute('aria-label', formula.title + ' reference');
        pin.element
          .querySelector('.bmc-formula-remove')!
          .setAttribute(
            'aria-label',
            'Remove ' + formula.title + ' from screen',
          );
        pin.subject.textContent = subject.name;
        if (pin.latex !== formula.latex) {
          renderer.render(pin.math, formula.latex);
          pin.latex = formula.latex;
        }
      }
      layout();
    },
    layout,
    dispose() {
      disposed = true;
      resize.disconnect();
      for (const pin of pins.values()) pin.element.remove();
      pins.clear();
    },
  };
}
