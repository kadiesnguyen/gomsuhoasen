import type { DetailedHTMLProps, HTMLAttributes, Ref } from 'react';

/**
 * JSX intrinsic element declaration for Google's <model-viewer> web component.
 * Covers every attribute used in ProductDetailViewer.
 * @see https://modelviewer.dev/docs/
 */

interface ModelViewerAttributes {
  src?: string;
  poster?: string;
  'camera-controls'?: boolean | string;
  'touch-action'?: string;
  'auto-rotate'?: boolean | string;
  'interaction-prompt'?: string;
  'camera-orbit'?: string;
  'camera-target'?: string;
  'min-camera-orbit'?: string;
  'max-camera-orbit'?: string;
  'interpolation-decay'?: string;
  ar?: boolean | string;
  'ar-modes'?: string;
  'ar-scale'?: string;
  'shadow-intensity'?: string;
  'environment-image'?: string;
  exposure?: string;
  class?: string;
  ref?: Ref<HTMLElement>;
  onLoad?: () => void;
  onError?: () => void;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & ModelViewerAttributes,
        HTMLElement
      >;
    }
  }
}
