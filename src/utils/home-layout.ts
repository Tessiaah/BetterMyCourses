import newspaper from '@phosphor-icons/core/assets/duotone/newspaper-duotone.svg?raw';
import students from '@phosphor-icons/core/assets/duotone/users-three-duotone.svg?raw';
import house from '@phosphor-icons/core/assets/duotone/house-duotone.svg?raw';
import feedback from '@phosphor-icons/core/assets/duotone/chat-circle-dots-duotone.svg?raw';
import arrow from '@phosphor-icons/core/assets/regular/arrow-right.svg?raw';

function icon(source: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'bmc-home-icon';
  element.setAttribute('aria-hidden', 'true');
  // Trusted, locally bundled Phosphor assets, never HTML from the site or user.
  element.innerHTML = source;
  return element;
}

// A one-time, reversible enhancement of native Home elements. Existing article
// nodes, handlers and editing controls are retained; no article data is stored.
export function createHomeLayout() {
  let enabled = false;
  let cleanup: (() => void) | undefined;
  let disposed = false;
  function update(active: boolean) {
    enabled = active;
    if (!active) {
      cleanup?.();
      cleanup = undefined;
      return;
    }
    if (
      disposed ||
      cleanup ||
      document.readyState === 'loading' ||
      document.body.id !== 'page-site-index'
    )
      return;
    const undo: (() => void)[] = [];
    const banner = document.querySelector<HTMLElement>('.aaltositepageheader');
    const context = document.querySelector<HTMLElement>(
      '.contextpage-context-header-content',
    );
    const title = context?.querySelector<HTMLElement>(
      '.page-context-header, .page-header-headings',
    );
    // Public Home has a login panel in the banner. Keep that panel's layout and
    // controls intact; the title overlay is for the ordinary signed-in Home.
    if (banner && title && context && !banner.querySelector('.loginheader')) {
      const marker = document.createComment(
        'BetterMyCourses original heading position',
      );
      title.before(marker);
      const copy = document.createElement('div');
      copy.className = 'bmc-home-hero-copy';
      const subtitle = document.createElement('p');
      subtitle.textContent =
        'Your courses, news and tools at Aalto University.';
      copy.append(title, subtitle);
      banner.append(copy);
      banner.classList.add('bmc-home-hero');
      // Keep native header actions visible if present in the source container.
      const empty = !context.querySelector(
        'a, button, input, select, textarea',
      );
      if (empty) context.dataset.bmcTitleMoved = 'true';
      undo.push(() => {
        marker.replaceWith(title);
        copy.remove();
        banner.classList.remove('bmc-home-hero');
        delete context.dataset.bmcTitleMoved;
      });
    }
    const tabs = [
      ...document.querySelectorAll<HTMLAnchorElement>(
        '.secondary-navigation .nav-link',
      ),
    ];
    for (const tab of tabs) {
      if (tab.querySelector('svg, .icon, .fa')) continue;
      // Native tab order is Home, Course feedback. Skip unexpected extra tabs.
      const index = tabs.indexOf(tab);
      if (index > 1) continue;
      const image = icon(index === 0 ? house : feedback);
      tab.prepend(image);
      undo.push(() => image.remove());
    }
    const blocks = [
      ...document.querySelectorAll<HTMLElement>(
        '#block-region-side-rsscontent > .block_rss_client',
      ),
    ];
    for (const [index, block] of blocks.entries()) {
      const heading = block.querySelector<HTMLElement>('.card-title');
      if (!heading || index > 1) continue;
      const marker = document.createComment(
        'BetterMyCourses original feed heading position',
      );
      heading.before(marker);
      const header = document.createElement('div');
      header.className = 'bmc-home-feed-heading';
      const image = icon(index === 0 ? newspaper : students);
      const all = document.createElement('a');
      all.className = 'bmc-home-all-news';
      all.href =
        index === 0
          ? 'https://www.aalto.fi/en/news'
          : 'https://www.aalto.fi/en/student-news';
      all.textContent = 'All news';
      all.setAttribute(
        'aria-label',
        index === 0 ? 'All Aalto news' : 'All student news',
      );
      all.append(icon(arrow));
      marker.after(header);
      header.append(image, heading, all);
      undo.push(() => {
        marker.replaceWith(heading);
        header.remove();
      });
    }
    cleanup = () => undo.reverse().forEach((fn) => fn());
  }
  const ready = () => update(enabled);
  document.addEventListener('DOMContentLoaded', ready, { once: true });
  return {
    update,
    dispose() {
      update(false);
      disposed = true;
      document.removeEventListener('DOMContentLoaded', ready);
    },
  };
}
