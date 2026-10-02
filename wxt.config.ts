import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  // Load the dev build in the user's chosen Brave/Chrome/Edge browser manually.
  webExt: { disabled: true },
  manifest: {
    name: 'BetterMyCourses',
    description:
      'An inky black theme for Aalto MyCourses, with custom banners and a calmer Home page.',
    permissions: ['storage'],
    host_permissions: ['https://mycourses.aalto.fi/*'],
    web_accessible_resources: [
      {
        resources: ['fonts/lexend-variable.ttf', 'fonts/rubik-variable.ttf'],
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
