export const SETTINGS_KEY = 'betterMyCourses.settings';
export const DEFAULT_SETTINGS = {
  enabled: true,
  theme: 'inky-black',
  linkColor: DEFAULT_LINK_COLOR,
  studyAssist: false,
} as const;
export type Settings = {
  enabled: boolean;
  theme: 'inky-black';
  linkColor: string;
  studyAssist: boolean;
};

// Validate synced data, including older or manually edited preference values.
export function normalizeSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null)
    return { ...DEFAULT_SETTINGS };
  const candidate = value as Record<string, unknown>;
  return {
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : true,
    theme: 'inky-black',
    linkColor: normalizeLinkColor(candidate.linkColor),
    studyAssist:
      typeof candidate.studyAssist === 'boolean'
        ? candidate.studyAssist
        : false,
  };
}
import { DEFAULT_LINK_COLOR, normalizeLinkColor } from './color';
