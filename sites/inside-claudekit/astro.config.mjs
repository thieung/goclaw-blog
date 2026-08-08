import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'static',
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  compressHTML: false,
  trailingSlash: 'never',
  i18n: {
    defaultLocale: 'vi',
    locales: ['vi', 'en', 'zh', 'ja'],
    routing: { prefixDefaultLocale: false },
  },
});
