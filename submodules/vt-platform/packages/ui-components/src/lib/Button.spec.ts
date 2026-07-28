/**
 * @vt/ui-components — Button behavioral tests.
 *
 * Invokes the Button functional component directly and asserts on the
 * returned React element tree: className mapping, disabled state,
 * loading spinner SVG, props forwarding, and invalid variant handling.
 */

import React from 'react';
import {
  DEFAULT_UI_BUTTON_SIZE,
  DEFAULT_UI_BUTTON_VARIANT,
  UI_BUTTON_SIZES,
  UI_BUTTON_VARIANTS,
} from '@vt/ui-primitives';
import { Button, type ButtonVariant, type ButtonSize } from '../index';

/** Invoke the functional component and return the output element tree. */
 
function render(props: React.ComponentProps<typeof Button>): React.ReactElement<any> {
  return Button(props) as React.ReactElement<any>;
}

describe('Button component', () => {
  describe('default output', () => {
    it('renders a <button> element', () => {
      const output = render({ children: 'Click' });
      expect(output.type).toBe('button');
    });

    it('applies default variant (primary) class', () => {
      const output = render({ children: 'Click' });
      const cls: string = output.props.className;
      expect(cls).toContain('bg-primary');
      expect(cls).toContain('text-primary-foreground');
    });

    it('applies default size (md) class', () => {
      const output = render({ children: 'Click' });
      const cls: string = output.props.className;
      expect(cls).toContain('h-9');
      expect(cls).toContain('px-4');
      expect(cls).toContain('text-sm');
    });

    it('is not disabled by default', () => {
      const output = render({ children: 'Click' });
      expect(output.props.disabled).toBeFalsy();
    });

    it('renders children as button text', () => {
      const output = render({ children: 'Save' });
      const children = React.Children.toArray(output.props.children);
      // First child is null (no spinner), second is 'Save'
      expect(children).toContain('Save');
    });
  });

  describe('variant className mapping', () => {
    const variantSubstrings: Record<string, string> = {
      primary: 'bg-primary',
      secondary: 'bg-white',
      destructive: 'bg-destructive',
      ghost: 'hover:bg-zinc-100',
      outline: 'border border-input bg-transparent',
      link: 'text-primary underline-offset-4',
    };

    for (const variant of UI_BUTTON_VARIANTS) {
      it(`variant="${variant}" includes expected class substring`, () => {
        const output = render({ variant: variant as ButtonVariant, children: variant });
        const cls: string = output.props.className;
        expect(cls).toContain(variantSubstrings[variant]);
      });
    }
  });

  describe('size className mapping', () => {
    const sizeSubstrings: Record<string, string> = {
      xs: 'h-6',
      sm: 'h-8',
      md: 'h-9',
      lg: 'h-10',
      icon: 'h-8 w-8',
    };

    for (const size of UI_BUTTON_SIZES) {
      it(`size="${size}" includes expected class substring`, () => {
        const output = render({ size: size as ButtonSize, children: size });
        const cls: string = output.props.className;
        expect(cls).toContain(sizeSubstrings[size]);
      });
    }
  });

  describe('loading state', () => {
    it('sets disabled=true when isLoading', () => {
      const output = render({ isLoading: true, children: 'Saving' });
      expect(output.props.disabled).toBe(true);
    });

    it('renders SVG spinner when isLoading', () => {
      const output = render({ isLoading: true, children: 'Saving' });
      const children = React.Children.toArray(output.props.children);
      const svg = children.find(
        (child) => React.isValidElement(child) && child.type === 'svg',
      );
      expect(svg).toBeTruthy();
      expect((svg as React.ReactElement<any>).props.className).toContain('animate-spin');
    });

    it('does not render SVG spinner when not loading', () => {
      const output = render({ children: 'Normal' });
      const children = React.Children.toArray(output.props.children);
      const svg = children.find(
        (child) => React.isValidElement(child) && child.type === 'svg',
      );
      expect(svg).toBeFalsy();
    });

    it('sets disabled=true when both isLoading and disabled', () => {
      const output = render({ isLoading: true, disabled: true, children: 'X' });
      expect(output.props.disabled).toBe(true);
    });
  });

  describe('disabled state (without loading)', () => {
    it('sets disabled when disabled=true', () => {
      const output = render({ disabled: true, children: 'Off' });
      expect(output.props.disabled).toBe(true);
    });

    it('does not render spinner when disabled without loading', () => {
      const output = render({ disabled: true, children: 'Off' });
      const children = React.Children.toArray(output.props.children);
      const svg = children.find(
        (child) => React.isValidElement(child) && child.type === 'svg',
      );
      expect(svg).toBeFalsy();
    });
  });

  describe('props forwarding', () => {
    it('forwards onClick to <button>', () => {
      const onClick = vi.fn();
      const output = render({ onClick, children: 'Go' });
      expect(output.props.onClick).toBe(onClick);
    });

    it('forwards type attribute', () => {
      const output = render({ type: 'submit', children: 'Submit' });
      expect(output.props.type).toBe('submit');
    });

    it('forwards aria-label', () => {
      const output = render({ 'aria-label': 'Close', children: 'X' });
      expect(output.props['aria-label']).toBe('Close');
    });

    it('forwards id', () => {
      const output = render({ id: 'save-btn', children: 'Save' });
      expect(output.props.id).toBe('save-btn');
    });

    it('appends custom className to generated classes', () => {
      const output = render({ className: 'ml-4', children: 'Test' });
      const cls: string = output.props.className;
      expect(cls).toContain('ml-4');
      // Also contains base classes
      expect(cls).toContain('inline-flex');
    });
  });

  describe('invalid variant/size runtime behavior', () => {
    it('falls back to default variant for unknown variant (no crash)', () => {
      // TypeScript prevents this at compile time, but JS consumers may pass invalid values.
      // Verified behavior: falls back to DEFAULT_UI_BUTTON_VARIANT (primary).
      const output = render({ variant: 'nonexistent' as ButtonVariant, children: 'X' });
      expect(output.type).toBe('button');
      const cls: string = output.props.className;
      expect(cls).not.toContain('undefined');
      expect(cls).toContain('bg-primary');
    });

    it('falls back to default size for unknown size (no crash)', () => {
      const output = render({ size: 'huge' as ButtonSize, children: 'X' });
      expect(output.type).toBe('button');
      const cls: string = output.props.className;
      expect(cls).not.toContain('undefined');
      expect(cls).toContain('h-9');
    });
  });

  describe('contract parity', () => {
    it('default variant constant matches expected value', () => {
      expect(DEFAULT_UI_BUTTON_VARIANT).toBe('primary');
    });

    it('default size constant matches expected value', () => {
      expect(DEFAULT_UI_BUTTON_SIZE).toBe('md');
    });
  });
});
