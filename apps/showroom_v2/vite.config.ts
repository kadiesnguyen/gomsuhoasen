import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'path';

const apiHost = process.env.API_HOST || '127.0.0.1';
const apiPort = process.env.API_PORT || '4310';
const apiProxyTarget = process.env.VITE_PROXY_API_TARGET || `http://${apiHost}:${apiPort}`;
const showroomPort = Number(process.env.SHOWROOM_PORT || 4313);

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      'next/link': resolve(__dirname, './src/app/mocks/next/link.tsx'),
      'next/navigation': resolve(__dirname, './src/app/mocks/next/navigation.ts'),
      '@gomhoasen/contracts': resolve(__dirname, '../../libs/contracts/src/index.ts'),
      '@gomhoasen/ui-showroom': resolve(__dirname, '../../libs/ui/showroom/src/index.ts'),
      '@gomhoasen/ui-showroom-server': resolve(__dirname, '../../libs/ui/showroom/src/server.ts'),
      '@gomhoasen/ui-rich-html': resolve(__dirname, '../../libs/ui/rich-html/src/index.ts'),
      '@vt/common-utils': resolve(__dirname, '../../submodules/vt-common-utils/src/index.ts'),
      '@vt/platform-api-client': resolve(__dirname, '../../submodules/vt-platform/packages/platform-api-client/src/index.ts'),
      '@vt/platform-api-contract/browser': resolve(__dirname, '../../submodules/vt-platform/packages/platform-api-contract/src/browser.ts'),
    }
  },
  server: {
    port: showroomPort,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../dist/apps/showroom_v2',
    emptyOutDir: true,
  },
});
