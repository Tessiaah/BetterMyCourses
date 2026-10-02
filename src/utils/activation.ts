import type { Settings } from './settings';
import { brighten, colorChannels } from './color';

const variables = [
  '--bmc-user-link',
  '--bmc-user-link-hover',
  '--bmc-user-link-rgb',
  '--bmc-user-link-hover-rgb',
];

export function removeTheme(root: HTMLElement): void {
  delete root.dataset.betterMyCourses;
  for (const name of variables) root.style.removeProperty(name);
}

export function applyTheme(root: HTMLElement, settings: Settings): void {
  if (!settings.enabled) {
    removeTheme(root);
    return;
  }
  const hover = brighten(settings.linkColor, 0.18);
  root.style.setProperty('--bmc-user-link', settings.linkColor);
  root.style.setProperty('--bmc-user-link-hover', hover);
  root.style.setProperty(
    '--bmc-user-link-rgb',
    colorChannels(settings.linkColor),
  );
  root.style.setProperty('--bmc-user-link-hover-rgb', colorChannels(hover));
  root.dataset.betterMyCourses = 'dark';
}
