/**
 * @vt/ui-components — Spinner & PageLoader behavioral tests.
 *
 * Invokes the Spinner and PageLoader functional components directly and
 * asserts on the returned React element tree: className mapping, composition,
 * label rendering, data-testid forwarding.
 */

import React from 'react';
import {
  DEFAULT_UI_PAGE_LOADER_SIZE,
  DEFAULT_UI_PAGE_LOADER_TONE,
  DEFAULT_UI_SPINNER_SIZE,
  DEFAULT_UI_SPINNER_TONE,
  UI_SPINNER_SIZES,
  UI_SPINNER_TONES,
  type UiSpinnerSize,
  type UiSpinnerTone,
} from '@vt/ui-primitives';
import { Spinner, PageLoader, type SpinnerProps } from '../index';

/** Invoke the Spinner functional component directly. */
 
function renderSpinner(props: Partial<SpinnerProps> = {}): React.ReactElement<any> {
  return Spinner(props as SpinnerProps) as React.ReactElement<any>;
}

/** Invoke the PageLoader functional component directly. */
 
function renderPageLoader(props: Partial<React.ComponentProps<typeof PageLoader>> = {}): React.ReactElement<any> {
  return PageLoader(props as React.ComponentProps<typeof PageLoader>) as React.ReactElement<any>;
}

describe('Spinner component', () => {
  describe('default output', () => {
    it('renders a Loader2 element (from lucide-react)', () => {
      const output = renderSpinner();
      // Loader2 is a ForwardRef component, not a plain string tag
      expect(output).toBeTruthy();
      expect(output.props.className).toContain('animate-spin');
    });

    it('applies default size (md) class', () => {
      const output = renderSpinner();
      expect(output.props.className).toContain('h-6');
      expect(output.props.className).toContain('w-6');
    });

    it('applies default tone (primary) class', () => {
      const output = renderSpinner();
      expect(output.props.className).toContain('text-blue-600');
    });
  });

  describe('size className mapping', () => {
    const sizeSubstrings: Record<string, string> = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-10 w-10',
    };

    for (const size of UI_SPINNER_SIZES) {
      it(`size="${size}" includes expected class substring`, () => {
        const output = renderSpinner({ size: size as UiSpinnerSize });
        const cls: string = output.props.className;
        const expected = sizeSubstrings[size];
        for (const part of expected.split(' ')) {
          expect(cls).toContain(part);
        }
      });
    }
  });

  describe('tone className mapping', () => {
    const toneSubstrings: Record<string, string> = {
      primary: 'text-blue-600',
      muted: 'text-zinc-400',
      inverse: 'text-white',
    };

    for (const tone of UI_SPINNER_TONES) {
      it(`tone="${tone}" includes expected class substring`, () => {
        const output = renderSpinner({ tone: tone as UiSpinnerTone });
        expect(output.props.className).toContain(toneSubstrings[tone]);
      });
    }
  });

  describe('props forwarding', () => {
    it('forwards testId as data-testid', () => {
      const output = renderSpinner({ testId: 'loading-spinner' });
      expect(output.props['data-testid']).toBe('loading-spinner');
    });

    it('appends custom className', () => {
      const output = renderSpinner({ className: 'my-spin' });
      const cls: string = output.props.className;
      expect(cls).toContain('my-spin');
      expect(cls).toContain('animate-spin');
    });
  });
});

describe('PageLoader component', () => {
  describe('default output', () => {
    it('renders a wrapper <div> with flex layout', () => {
      const output = renderPageLoader();
      expect(output.type).toBe('div');
      expect(output.props.className).toContain('flex');
      expect(output.props.className).toContain('items-center');
    });

    it('uses default containerClassName h-64', () => {
      const output = renderPageLoader();
      expect(output.props.className).toContain('h-64');
    });

    it('contains a Spinner child inside inner div', () => {
      const output = renderPageLoader();
      // Structure: <div><div><Spinner/>{label?}</div></div>
      const innerDiv = output.props.children;
      expect(innerDiv).toBeTruthy();
      const innerChildren = React.Children.toArray(innerDiv.props.children);
      // First child should be a Spinner element
      const spinnerEl = innerChildren[0];
      expect(React.isValidElement(spinnerEl)).toBe(true);
      expect((spinnerEl as React.ReactElement).type).toBe(Spinner);
    });

    it('does not render label paragraph when label is omitted', () => {
      const output = renderPageLoader();
      const innerDiv = output.props.children;
      const innerChildren = React.Children.toArray(innerDiv.props.children);
      // Should only have the Spinner, no <p> label
      const paragraphs = innerChildren.filter(
        (child) => React.isValidElement(child) && child.type === 'p',
      );
      expect(paragraphs).toHaveLength(0);
    });
  });

  describe('label rendering', () => {
    it('renders a <p> with label text when provided', () => {
      const output = renderPageLoader({ label: 'Loading data...' });
      const innerDiv = output.props.children;
      const innerChildren = React.Children.toArray(innerDiv.props.children);
      const paragraph = innerChildren.find(
        (child) => React.isValidElement(child) && child.type === 'p',
      );
      expect(paragraph).toBeTruthy();
      expect((paragraph as React.ReactElement<any>).props.children).toBe('Loading data...');
    });
  });

  describe('props forwarding', () => {
    it('uses default class names when no custom className is provided', () => {
      const output = renderPageLoader();
      expect(output.props.className).toContain('flex items-center justify-center');
      expect(output.props.className).toContain('h-64');
    });

    it('uses custom className and ignores default h-64 if className is provided', () => {
      const output = renderPageLoader({ className: 'h-screen' });
      expect(output.props.className).toContain('flex items-center justify-center');
      expect(output.props.className).toContain('h-screen');
      expect(output.props.className).not.toContain('h-64');
    });

    it('uses containerClassName and preserves default h-64', () => {
      const output = renderPageLoader({ containerClassName: 'custom-container' });
      expect(output.props.className).toContain('flex items-center justify-center');
      expect(output.props.className).toContain('h-64');
      expect(output.props.className).toContain('custom-container');
    });

    it('combines custom className and containerClassName', () => {
      const output = renderPageLoader({ className: 'h-screen', containerClassName: 'custom-container' });
      expect(output.props.className).toContain('flex items-center justify-center');
      expect(output.props.className).toContain('h-screen');
      expect(output.props.className).toContain('custom-container');
      expect(output.props.className).not.toContain('h-64');
    });

    it('forwards testId as data-testid on wrapper', () => {
      const output = renderPageLoader({ testId: 'page-loader' });
      expect(output.props['data-testid']).toBe('page-loader');
    });

    it('passes size and tone to inner Spinner', () => {
      const output = renderPageLoader({ size: 'xl', tone: 'inverse' });
      const innerDiv = output.props.children;
      const innerChildren = React.Children.toArray(innerDiv.props.children);
      const spinnerEl = innerChildren[0] as React.ReactElement<any>;
      expect(spinnerEl.props.size).toBe('xl');
      expect(spinnerEl.props.tone).toBe('inverse');
    });
  });

  describe('contract parity', () => {
    it('default page loader size is lg', () => {
      expect(DEFAULT_UI_PAGE_LOADER_SIZE).toBe('lg');
    });

    it('default page loader tone is muted', () => {
      expect(DEFAULT_UI_PAGE_LOADER_TONE).toBe('muted');
    });

    it('default spinner size is md', () => {
      expect(DEFAULT_UI_SPINNER_SIZE).toBe('md');
    });

    it('default spinner tone is primary', () => {
      expect(DEFAULT_UI_SPINNER_TONE).toBe('primary');
    });
  });
});
