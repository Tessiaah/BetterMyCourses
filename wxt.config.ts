import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  // Load the dev build in the user's chosen Brave/Chrome/Edge browser manually.
  webExt: { disabled: true },
  // Chromium rejects literal noncharacters (KaTeX includes U+FFFF in its lexer).
  // Escape via the code generator so runtime strings and regexes are preserved.
  vite: () => ({
    build: {
      rolldownOptions: {
        output: { minify: { codegen: { asciiOnly: true } } },
      },
    },
  }),
  manifest: {
    name: 'BetterMyCourses',
    description:
      'An inky black theme for Aalto MyCourses, with custom banners and a calmer Home page.',
    permissions: ['storage'],
    host_permissions: ['https://mycourses.aalto.fi/*'],
    web_accessible_resources: [
      {
        resources: [
          'fonts/lexend-variable.ttf',
          'fonts/rubik-variable.ttf',
          'fonts/katex/*.woff2',
        ],
        matches: ['https://mycourses.aalto.fi/*'],
      },
    ],
    action: { default_title: 'BetterMyCourses' },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
  },
});
