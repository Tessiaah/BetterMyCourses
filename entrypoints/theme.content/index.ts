import { defineContentScript } from 'wxt/utils/define-content-script';
import { applyTheme, removeTheme } from '../../src/utils/activation';
import { registerTypography } from '../../src/utils/fonts';
import { browser } from 'wxt/browser';
import { readSettings, watchSettings } from '../../src/utils/preferences';
import './style.css';
import { createBannerLayout } from '../../src/utils/banner-layout';
import { createHomeLayout } from '../../src/utils/home-layout';
import { createCourseHeaderTheme } from '../../src/utils/course-header';
import { createStudyAssist } from '../../src/features/study-assist';
import {
  applyBanners,
  defaultBanners,
  readBanners,
  watchBanners,
} from '../../src/utils/banners';

export default defineContentScript({
  matches: ['https://mycourses.aalto.fi/*'],
  runAt: 'document_start',
  main(ctx) {
    let banners = defaultBanners();
    let enabled = false;
    const bannerLayout = createBannerLayout();
    const homeLayout = createHomeLayout();
    const courseHeader = createCourseHeaderTheme();
    const studyAssist = createStudyAssist();
    const renderBanners = () => {
      applyBanners(document.documentElement, banners, enabled);
      homeLayout.update(enabled);
      courseHeader.update(enabled);
      bannerLayout.update(banners, enabled);
    };
    let bannerRevision = 0;
    const stopBanners = watchBanners((value) => {
      bannerRevision++;
      banners = value;
      renderBanners();
    });
    const initialBannerRevision = bannerRevision;
    void readBanners()
      .then((value) => {
        if (ctx.isValid && bannerRevision === initialBannerRevision) {
          banners = value;
          renderBanners();
        }
      })
      .catch(() => {
        /* Keep the original banner if local storage is unavailable. */
      });
    const removeFonts = registerTypography(document.fonts, (path) =>
      browser.runtime.getURL(path),
    );
    // Subscribe before reading so a popup change cannot be lost during startup.
    let revision = 0;
    const stopWatching = watchSettings((settings) => {
      revision++;
      applyTheme(document.documentElement, settings);
      enabled = settings.enabled;
      studyAssist.update(settings.studyAssist);
      renderBanners();
    });
    const initialRevision = revision;
    void readSettings()
      .then((settings) => {
        if (ctx.isValid && revision === initialRevision) {
          applyTheme(document.documentElement, settings);
          enabled = settings.enabled;
          studyAssist.update(settings.studyAssist);
          renderBanners();
        }
      })
      .catch(() => {
        // Leave the original site usable if extension storage is unavailable.
      });
    ctx.onInvalidated(() => {
      stopWatching();
      removeTheme(document.documentElement);
      removeFonts();
      stopBanners();
      bannerLayout.dispose();
      homeLayout.dispose();
      courseHeader.dispose();
      studyAssist.dispose();
      applyBanners(document.documentElement, defaultBanners(), false);
    });
  },
});
