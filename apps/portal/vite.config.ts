import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const apiHost = process.env.API_HOST || '127.0.0.1';
const apiPort = process.env.API_PORT || '4310';
const apiProxyTarget = process.env.VITE_PROXY_API_TARGET || `http://${apiHost}:${apiPort}`;
const portalPort = Number(process.env.PORTAL_PORT || 4311);
const showroomPort = process.env.SHOWROOM_PORT || '4312';
const showroomProxyTarget =
  process.env.VITE_SITE_URL ||
  process.env.SHOWROOM_ORIGIN ||
  `http://${apiHost}:${showroomPort}`;

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@gomhoasen/ui-portal': resolve(__dirname, '../../libs/ui/portal/src/index.ts'),
      '@gomhoasen/contracts': resolve(__dirname, '../../libs/contracts/src/index.ts'),
      '@gomhoasen/core': resolve(__dirname, '../../libs/core/src/index.ts'),
      '@vt/common-utils': resolve(__dirname, '../../submodules/vt-common-utils/src/index.ts'),
      '@vt/nest-core': resolve(__dirname, '../../submodules/vt-nest-core/src/index.ts'),
      '@vt/platform-api-client': resolve(__dirname, '../../submodules/vt-platform/packages/platform-api-client/src/index.ts'),
      '@vt/platform-api-contract/browser': resolve(__dirname, '../../submodules/vt-platform/packages/platform-api-contract/src/browser.ts'),
      '@vt/platform-api-contract': resolve(__dirname, '../../submodules/vt-platform/packages/platform-api-contract/src/index.ts'),
      '@vt/platform-error': resolve(__dirname, '../../submodules/vt-platform/packages/platform-error/src/index.ts'),
      '@vt/platform-state-machine': resolve(__dirname, '../../submodules/vt-platform/packages/platform-state-machine/src/index.ts'),
      '@vt/platform-events': resolve(__dirname, '../../submodules/vt-platform/packages/platform-events/src/index.ts'),
      '@vt/ui-primitives': resolve(__dirname, '../../submodules/vt-platform/packages/ui-primitives/src/index.ts'),
      '@vt/ui-components': resolve(__dirname, '../../submodules/vt-platform/packages/ui-components/src/index.ts'),
      '@vt/ecommerce-core/money': resolve(__dirname, '../../submodules/vt-platform/packages/ecommerce-core/src/money.ts'),
      '@vt/ecommerce-core/pricing': resolve(__dirname, '../../submodules/vt-platform/packages/ecommerce-core/src/pricing.ts'),
      '@vt/ecommerce-core': resolve(__dirname, '../../submodules/vt-platform/packages/ecommerce-core/src/index.ts')
    }
  },
  server: {
    port: portalPort,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/assets': {
        target: showroomProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../dist/apps/portal',
    emptyOutDir: true
  },
  base: '/admin/'
});
