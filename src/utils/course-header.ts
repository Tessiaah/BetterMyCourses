// Aalto also has classless, inline-painted title wrappers. Inspect only the
// title's ancestor chain and known chrome wrappers, never course text, grades
// or question contents.
export function isLightHeaderSurface(color: string): boolean {
  const match = /^rgba?\(([^)]+)\)$/.exec(color);
  if (!match) return false;
  const channels = match[1]!.split(/[\s,/]+/).map(Number);
  const [r = 0, g = 0, b = 0, alpha = 1] = channels;
  return alpha >= 0.45 && 0.2126 * r + 0.7152 * g + 0.0722 * b > 160;
}

export function createCourseHeaderTheme() {
  let enabled = false;
  let disposed = false;
  const undo: (() => void)[] = [];

  function restore() {
    for (const reset of undo.splice(0).reverse()) reset();
  }
  function update(active: boolean) {
    enabled = active;
    if (!active) {
      restore();
      return;
    }
    if (disposed || undo.length || document.readyState === 'loading') return;
    if (
      !/^\/(course|mod)\//.test(location.pathname) &&
      !/^page-(course|mod)-/.test(document.body.id)
    )
      return;
    if (
      document.body.matches(
        ".path-course, .path-mod-forum, [id^='page-course-'], [id^='page-mod-forum-']",
      )
    ) {
      // Empty headings still have nested divs/whitespace, so :empty misses them.
      // Retain any native text, media or interactive controls in these wrappers.
      for (const panel of document.querySelectorAll<HTMLElement>(
        '#topofscroll .contextpage-context-header-content, #topofscroll .header-courseend',
      )) {
        if (
          panel.innerText.trim() ||
          panel.querySelector(
            'a, button, input, select, textarea, img, svg, canvas, video, audio, iframe, ' +
              '[role="button"], [role="link"], [contenteditable], [tabindex]',
          )
        )
          continue;
        const previous = panel.getAttribute('data-bmc-empty-course-header');
        panel.setAttribute('data-bmc-empty-course-header', 'true');
        undo.push(() => {
          if (previous === null)
            panel.removeAttribute('data-bmc-empty-course-header');
          else panel.setAttribute('data-bmc-empty-course-header', previous);
        });
      }
    }
    const titles = document.querySelectorAll<HTMLElement>(
      '#page-header h1, #course-header h1, .course-header h1, ' +
        '.aaltocoursepageheader h1, .page-context-header h1, .page-header-headings h1',
    );
    const seen = new Set<HTMLElement>();
    for (const title of titles) {
      let element: HTMLElement | null = title;
      for (
        let depth = 0;
        element && depth < 6;
        depth++, element = element.parentElement
      ) {
        if (
          element === document.body ||
          element.id === 'region-main' ||
          element.id === 'page' ||
          element.id === 'page-content'
        )
          break;
        if (seen.has(element)) continue;
        seen.add(element);
        const style = getComputedStyle(element);
        // Never paint an image/banner itself. Only a pale title-panel wrapper.
        if (
          style.backgroundImage !== 'none' ||
          !isLightHeaderSurface(style.backgroundColor)
        )
          continue;
        const panel = element;
        const previous = panel.getAttribute('data-bmc-course-title-panel');
        panel.setAttribute('data-bmc-course-title-panel', 'true');
        let restoreInline: (() => void) | undefined;
        if (isLightHeaderSurface(getComputedStyle(panel).backgroundColor)) {
          // A legacy inline !important cannot be overridden by a stylesheet.
          // Modify only this panel's color, retaining and restoring its source.
          const originalStyle = panel.getAttribute('style');
          const oldColor = panel.style.getPropertyValue('background-color');
          const oldPriority =
            panel.style.getPropertyPriority('background-color');
          panel.style.setProperty(
            'background-color',
            'var(--bmc-page)',
            'important',
          );
          const appliedStyle = panel.getAttribute('style');
          restoreInline = () => {
            if (panel.getAttribute('style') === appliedStyle) {
              if (originalStyle === null) panel.removeAttribute('style');
              else panel.setAttribute('style', originalStyle);
            } else if (oldColor)
              panel.style.setProperty(
                'background-color',
                oldColor,
                oldPriority,
              );
            else panel.style.removeProperty('background-color');
          };
        }
        undo.push(() => {
          restoreInline?.();
          if (previous === null)
            panel.removeAttribute('data-bmc-course-title-panel');
          else panel.setAttribute('data-bmc-course-title-panel', previous);
        });
      }
    }
  }
  const ready = () => update(enabled);
  document.addEventListener('DOMContentLoaded', ready, { once: true });
  return {
    update,
    dispose() {
      disposed = true;
      document.removeEventListener('DOMContentLoaded', ready);
      restore();
    },
  };
}
