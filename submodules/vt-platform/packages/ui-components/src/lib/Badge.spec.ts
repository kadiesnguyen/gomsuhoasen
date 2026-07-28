/**
 * @vt/ui-components — Badge behavioral tests.
 *
 * Invokes the Badge functional component directly and asserts on the
 * returned React element tree: className variant mapping, label rendering,
 * data attributes forwarding, and invalid variant handling.
 */

import React from 'react';
import {
  DEFAULT_UI_BADGE_VARIANT,
  UI_BADGE_VARIANTS,
} from '@vt/ui-primitives';
import { Badge, type BadgeVariant } from '../index';

/** Invoke the functional component and return the output element tree. */
 
function render(props: React.ComponentProps<typeof Badge>): React.ReactElement<any> {
  return Badge(props) as React.ReactElement<any>;
}

describe('Badge component', () => {
  describe('default output', () => {
    it('renders a <span> element', () => {
      const output = render({ label: 'Active' });
      expect(output.type).toBe('span');
    });

    it('applies default variant (neutral) class', () => {
      const output = render({ label: 'Active' });
      const cls: string = output.props.className;
      expect(cls).toContain('bg-zinc-100');
      expect(cls).toContain('text-zinc-700');
    });

    it('renders label as text child', () => {
      const output = render({ label: 'Published' });
      expect(output.props.children).toBe('Published');
    });

    it('includes base badge classes', () => {
      const output = render({ label: 'Test' });
      const cls: string = output.props.className;
      expect(cls).toContain('inline-flex');
      expect(cls).toContain('rounded');
      expect(cls).toContain('font-semibold');
      expect(cls).toContain('uppercase');
    });
  });

  describe('variant className mapping', () => {
    const variantSubstrings: Record<string, string> = {
      success: 'bg-emerald-50',
      warning: 'bg-amber-50',
      danger: 'bg-red-50',
      info: 'bg-blue-50',
      neutral: 'bg-zinc-100',
      outline: 'bg-transparent',
    };

    for (const variant of UI_BADGE_VARIANTS) {
      it(`variant="${variant}" includes expected class substring`, () => {
        const output = render({ label: variant, variant: variant as BadgeVariant });
        const cls: string = output.props.className;
        expect(cls).toContain(variantSubstrings[variant]);
      });
    }
  });

  describe('data attributes forwarding', () => {
    it('forwards data-testid to rendered <span>', () => {
      const output = render({ label: 'Active', 'data-testid': 'status-badge' });
      expect(output.props['data-testid']).toBe('status-badge');
    });

    it('forwards data-status to rendered <span>', () => {
      const output = render({ label: 'Active', 'data-status': 'active' });
      expect(output.props['data-status']).toBe('active');
    });

    it('omits data-testid when not provided', () => {
      const output = render({ label: 'Test' });
      expect(output.props['data-testid']).toBeUndefined();
    });
  });

  describe('custom className', () => {
    it('appends custom className to generated classes', () => {
      const output = render({ label: 'Test', className: 'ml-2' });
      const cls: string = output.props.className;
      expect(cls).toContain('ml-2');
      expect(cls).toContain('inline-flex');
    });
  });

  describe('invalid variant runtime behavior', () => {
    it('falls back to default variant for unknown variant (no crash)', () => {
      const output = render({ label: 'X', variant: 'nonexistent' as BadgeVariant });
      expect(output.type).toBe('span');
      const cls: string = output.props.className;
      expect(cls).not.toContain('undefined');
      expect(cls).toContain('bg-zinc-100');
    });
  });

  describe('contract parity', () => {
    it('default variant constant matches expected value', () => {
      expect(DEFAULT_UI_BADGE_VARIANT).toBe('neutral');
    });
  });
});
