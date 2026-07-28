/**
 * @vt/ui-components — EmptyState behavioral tests.
 *
 * Invokes the EmptyState functional component directly and asserts on the
 * returned React element tree: default icon, testId, title/description
 * rendering, action button, and invalid action handling.
 */

import React from 'react';
import {
  DEFAULT_UI_EMPTY_STATE_ICON,
  DEFAULT_UI_EMPTY_STATE_TEST_ID,
  isUiEmptyStateAction,
} from '@vt/ui-primitives';
import { EmptyState, type EmptyStateProps } from '../index';

/** Invoke the functional component and return the output element tree. */
 
function render(props: EmptyStateProps): React.ReactElement<any> {
  return EmptyState(props) as React.ReactElement<any>;
}

/** Walk the element tree to find children matching a predicate. */
 
function findInTree(
  el: React.ReactElement<any>,
  predicate: (child: React.ReactElement<any>) => boolean,
): React.ReactElement<any> | undefined {
  if (predicate(el)) return el;
  const children = React.Children.toArray(el.props.children);
  for (const child of children) {
    if (!React.isValidElement(child)) continue;
    const found = findInTree(child as React.ReactElement<any>, predicate);
    if (found) return found;
  }
  return undefined;
}

describe('EmptyState component', () => {
  describe('default output', () => {
    it('renders a wrapper <div> with data-testid', () => {
      const output = render({ title: 'No data' });
      expect(output.type).toBe('div');
      expect(output.props['data-testid']).toBe(DEFAULT_UI_EMPTY_STATE_TEST_ID);
    });

    it('renders default icon emoji inside icon container', () => {
      const output = render({ title: 'No data' });
      const iconDiv = findInTree(output, (el) =>
        el.props?.['aria-hidden'] === 'true',
      );
      expect(iconDiv).toBeTruthy();
      expect(iconDiv!.props.children).toBe(DEFAULT_UI_EMPTY_STATE_ICON);
    });

    it('renders title in an <h3> element', () => {
      const output = render({ title: 'Nothing here' });
      const h3 = findInTree(output, (el) => el.type === 'h3');
      expect(h3).toBeTruthy();
      expect(h3!.props.children).toBe('Nothing here');
    });
  });

  describe('description rendering', () => {
    it('renders a <p> with description when provided', () => {
      const output = render({ title: 'Empty', description: 'Try adjusting filters' });
      const p = findInTree(output, (el) => el.type === 'p');
      expect(p).toBeTruthy();
      expect(p!.props.children).toBe('Try adjusting filters');
    });

    it('does not render <p> when description is omitted', () => {
      const output = render({ title: 'Empty' });
      const p = findInTree(output, (el) => el.type === 'p');
      expect(p).toBeUndefined();
    });
  });

  describe('action button rendering', () => {
    it('renders action <button> when action is provided', () => {
      const onClick = vi.fn();
      const output = render({
        title: 'Empty',
        action: { label: 'Create new', onClick },
      });
      const button = findInTree(output, (el) => el.type === 'button');
      expect(button).toBeTruthy();
      expect(button!.props.children).toBe('Create new');
      expect(button!.props.onClick).toBe(onClick);
    });

    it('does not render action <button> when action is omitted', () => {
      const output = render({ title: 'Empty' });
      const button = findInTree(output, (el) => el.type === 'button');
      expect(button).toBeUndefined();
    });

    it('action conforms to UiEmptyStateAction guard', () => {
      const validAction = { label: 'Create', onClick: vi.fn() };
      expect(isUiEmptyStateAction(validAction)).toBe(true);

      const invalidAction1 = { label: '  ', onClick: vi.fn() };
      expect(isUiEmptyStateAction(invalidAction1)).toBe(false);

      const invalidAction2 = { label: 'Create' };
      expect(isUiEmptyStateAction(invalidAction2)).toBe(false);
    });
  });

  describe('custom props', () => {
    it('uses custom testId on wrapper data-testid', () => {
      const output = render({ title: 'Empty', testId: 'custom-empty' });
      expect(output.props['data-testid']).toBe('custom-empty');
    });

    it('uses custom icon instead of default emoji', () => {
      const customIcon = React.createElement('span', null, '🎉');
      const output = render({ title: 'Empty', icon: customIcon });
      const iconDiv = findInTree(output, (el) =>
        el.props?.['aria-hidden'] === 'true',
      );
      expect(iconDiv).toBeTruthy();
      expect(iconDiv!.props.children).toBe(customIcon);
    });
  });

  describe('contract parity', () => {
    it('DEFAULT_UI_EMPTY_STATE_ICON is the mailbox emoji', () => {
      expect(DEFAULT_UI_EMPTY_STATE_ICON).toBe('\u{1F4ED}');
    });

    it('DEFAULT_UI_EMPTY_STATE_TEST_ID is empty-state', () => {
      expect(DEFAULT_UI_EMPTY_STATE_TEST_ID).toBe('empty-state');
    });
  });
});
