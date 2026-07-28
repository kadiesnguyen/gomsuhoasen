import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_UI_BADGE_VARIANT,
  DEFAULT_UI_BUTTON_SIZE,
  DEFAULT_UI_BUTTON_VARIANT,
  DEFAULT_UI_DENSITY,
  DEFAULT_UI_EMPTY_STATE_ICON,
  DEFAULT_UI_EMPTY_STATE_TEST_ID,
  DEFAULT_UI_PAGE_LOADER_SIZE,
  DEFAULT_UI_PAGE_LOADER_TONE,
  DEFAULT_UI_PROGRESS_PERCENT,
  DEFAULT_UI_SPINNER_SIZE,
  DEFAULT_UI_SPINNER_TONE,
  DEFAULT_UI_TABLE_ALIGN,
  DEFAULT_UI_TOAST_AUTO_DISMISS_MS,
  DEFAULT_UI_TOAST_STACK_LIMIT,
  DEFAULT_UI_TOAST_TEST_ID,
  DEFAULT_UI_TOAST_TYPE,
  UI_BADGE_VARIANTS,
  UI_BUTTON_SIZES,
  UI_BUTTON_VARIANTS,
  UI_DENSITIES,
  MAX_UI_PROGRESS_PERCENT,
  MIN_UI_PROGRESS_PERCENT,
  UI_SPINNER_SIZES,
  UI_SPINNER_TONES,
  UI_STATE_RENDERER_STATES,
  UI_TABLE_ALIGNS,
  UI_TOAST,
  UI_TOAST_TYPES,
  appendUiToastItem,
  isUiBadgeVariant,
  isUiButtonSize,
  isUiButtonVariant,
  isUiDensity,
  isUiEmptyStateAction,
  isUiSpinnerSize,
  isUiSpinnerTone,
  isUiTableAlign,
  isUiToastType,
  readUiBadgeVariant,
  readUiButtonSize,
  readUiButtonVariant,
  readUiDensity,
  readUiDisplayText,
  readUiEmptyStateAction,
  readUiProgressPercent,
  readUiSpinnerSize,
  readUiSpinnerTone,
  readUiTableAlign,
  readUiToastType,
  readUiTrimmedString,
  resolveUiStateRendererState,
  type UiStateRendererEmptyAction,
  type UiTableColumn,
  type UiToastItem,
} from './index';

describe('ui-primitives density contracts', () => {
  it('exposes the canonical UI density values', () => {
    assert.deepEqual(UI_DENSITIES, ['public', 'commerce', 'community', 'operational']);
    assert.equal(DEFAULT_UI_DENSITY, 'public');
  });

  it('reads UI density values with a safe fallback', () => {
    assert.equal(isUiDensity('community'), true);
    assert.equal(isUiDensity('compact'), false);
    assert.equal(readUiDensity('operational'), 'operational');
    assert.equal(readUiDensity('compact'), 'public');
    assert.equal(readUiDensity(undefined, 'commerce'), 'commerce');
  });
});

describe('ui-primitives progress contracts', () => {
  it('exposes canonical progress percent bounds', () => {
    assert.equal(MIN_UI_PROGRESS_PERCENT, 0);
    assert.equal(MAX_UI_PROGRESS_PERCENT, 100);
    assert.equal(DEFAULT_UI_PROGRESS_PERCENT, 0);
  });

  it('reads progress percent values with a finite clamped fallback', () => {
    assert.equal(readUiProgressPercent(42.5), 42.5);
    assert.equal(readUiProgressPercent(-1), 0);
    assert.equal(readUiProgressPercent(125), 100);
    assert.equal(readUiProgressPercent(undefined), 0);
    assert.equal(readUiProgressPercent(Number.NaN, 35), 35);
    assert.equal(readUiProgressPercent('50', 10), 10);
    assert.equal(readUiProgressPercent(null, Number.POSITIVE_INFINITY), 0);
  });
});

describe('ui-primitives text contracts', () => {
  it('reads non-empty trimmed strings', () => {
    assert.equal(readUiTrimmedString('  Create  '), 'Create');
    assert.equal(readUiTrimmedString('  '), undefined);
    assert.equal(readUiTrimmedString(42), undefined);
  });

  it('reads display text with a fallback', () => {
    assert.equal(readUiDisplayText('  Saved  ', 'Fallback'), 'Saved');
    assert.equal(readUiDisplayText('  ', 'Fallback'), 'Fallback');
    assert.equal(readUiDisplayText(undefined, 'Fallback'), 'Fallback');
  });
});

describe('ui-primitives badge contracts', () => {
  it('exposes the canonical semantic badge variants', () => {
    assert.deepEqual(UI_BADGE_VARIANTS, ['success', 'warning', 'danger', 'info', 'neutral', 'outline']);
    assert.equal(DEFAULT_UI_BADGE_VARIANT, 'neutral');
  });

  it('reads badge variants with a safe fallback', () => {
    assert.equal(isUiBadgeVariant('success'), true);
    assert.equal(isUiBadgeVariant('missing'), false);
    assert.equal(readUiBadgeVariant('outline'), 'outline');
    assert.equal(readUiBadgeVariant('missing'), 'neutral');
    assert.equal(readUiBadgeVariant(undefined, 'info'), 'info');
  });
});

describe('ui-primitives button contracts', () => {
  it('exposes the canonical semantic button variants and sizes', () => {
    assert.deepEqual(UI_BUTTON_VARIANTS, [
      'primary',
      'secondary',
      'destructive',
      'ghost',
      'outline',
      'link',
    ]);
    assert.deepEqual(UI_BUTTON_SIZES, ['xs', 'sm', 'md', 'lg', 'icon']);
    assert.equal(DEFAULT_UI_BUTTON_VARIANT, 'primary');
    assert.equal(DEFAULT_UI_BUTTON_SIZE, 'md');
  });

  it('reads button variants and sizes with safe fallbacks', () => {
    assert.equal(isUiButtonVariant('ghost'), true);
    assert.equal(isUiButtonVariant('tertiary'), false);
    assert.equal(readUiButtonVariant('link'), 'link');
    assert.equal(readUiButtonVariant('tertiary'), 'primary');
    assert.equal(readUiButtonVariant(undefined, 'outline'), 'outline');

    assert.equal(isUiButtonSize('icon'), true);
    assert.equal(isUiButtonSize('huge'), false);
    assert.equal(readUiButtonSize('xs'), 'xs');
    assert.equal(readUiButtonSize('huge'), 'md');
    assert.equal(readUiButtonSize(undefined, 'lg'), 'lg');
  });
});

describe('ui-primitives spinner contracts', () => {
  it('exposes the canonical semantic spinner sizes and tones', () => {
    assert.deepEqual(UI_SPINNER_SIZES, ['sm', 'md', 'lg', 'xl']);
    assert.deepEqual(UI_SPINNER_TONES, ['primary', 'muted', 'inverse']);
    assert.equal(DEFAULT_UI_SPINNER_SIZE, 'md');
    assert.equal(DEFAULT_UI_SPINNER_TONE, 'primary');
    assert.equal(DEFAULT_UI_PAGE_LOADER_SIZE, 'lg');
    assert.equal(DEFAULT_UI_PAGE_LOADER_TONE, 'muted');
  });

  it('reads spinner sizes and tones with safe fallbacks', () => {
    assert.equal(isUiSpinnerSize('lg'), true);
    assert.equal(isUiSpinnerSize('2xl'), false);
    assert.equal(readUiSpinnerSize('xl'), 'xl');
    assert.equal(readUiSpinnerSize('2xl'), 'md');
    assert.equal(readUiSpinnerSize(undefined, 'sm'), 'sm');

    assert.equal(isUiSpinnerTone('inverse'), true);
    assert.equal(isUiSpinnerTone('danger'), false);
    assert.equal(readUiSpinnerTone('muted'), 'muted');
    assert.equal(readUiSpinnerTone('danger'), 'primary');
    assert.equal(readUiSpinnerTone(undefined, 'inverse'), 'inverse');
  });
});

describe('ui-primitives empty state contracts', () => {
  it('exposes default empty state primitives', () => {
    assert.equal(DEFAULT_UI_EMPTY_STATE_ICON, '\u{1F4ED}');
    assert.equal(DEFAULT_UI_EMPTY_STATE_TEST_ID, 'empty-state');
  });

  it('reads empty state actions with a safe shape check', () => {
    const action = { label: 'Create', onClick: () => undefined };
    assert.equal(isUiEmptyStateAction(action), true);
    assert.equal(readUiEmptyStateAction(action), action);
    assert.equal(isUiEmptyStateAction({ label: '  ', onClick: () => undefined }), false);
    assert.equal(isUiEmptyStateAction({ label: 'Create' }), false);
    assert.equal(readUiEmptyStateAction(undefined), undefined);
  });
});

describe('ui-primitives table contracts', () => {
  it('exposes canonical table alignment values', () => {
    assert.deepEqual(UI_TABLE_ALIGNS, ['left', 'center', 'right']);
    assert.equal(DEFAULT_UI_TABLE_ALIGN, 'left');
  });

  it('reads table align values with a safe fallback', () => {
    assert.equal(isUiTableAlign('center'), true);
    assert.equal(isUiTableAlign('justify'), false);
    assert.equal(readUiTableAlign('right'), 'right');
    assert.equal(readUiTableAlign('justify'), 'left');
    assert.equal(readUiTableAlign(undefined, 'center'), 'center');
  });

  it('supports project-specific cell types through the generic column contract', () => {
    const column: UiTableColumn<{ name: string }, string> = {
      header: 'Name',
      accessor: (item) => item.name,
      align: 'left',
    };

    assert.equal(column.accessor({ name: 'Demo' }), 'Demo');
  });
});

describe('ui-primitives state renderer contracts', () => {
  it('exposes canonical state renderer states', () => {
    assert.deepEqual(UI_STATE_RENDERER_STATES, ['loading', 'error', 'empty', 'content']);
  });

  it('resolves state renderer priority deterministically', () => {
    assert.equal(resolveUiStateRendererState({ isLoading: true, isError: true, isEmpty: true }), 'loading');
    assert.equal(resolveUiStateRendererState({ isLoading: false, isError: true, isEmpty: true }), 'error');
    assert.equal(resolveUiStateRendererState({ isLoading: false, isError: false, isEmpty: true }), 'empty');
    assert.equal(resolveUiStateRendererState({ isLoading: false, isError: false }), 'content');
  });

  it('supports project-specific empty action icons through a generic action contract', () => {
    const action: UiStateRendererEmptyAction<string> = {
      label: 'Create',
      onClick: () => undefined,
      icon: 'plus',
    };

    assert.equal(action.icon, 'plus');
  });
});

describe('ui-primitives toast contracts', () => {
  it('exposes canonical toast types and defaults', () => {
    assert.deepEqual(UI_TOAST_TYPES, ['success', 'error', 'info', 'warning']);
    assert.deepEqual(UI_TOAST, {
      SUCCESS: 'success',
      ERROR: 'error',
      INFO: 'info',
      WARNING: 'warning',
    });
    assert.equal(DEFAULT_UI_TOAST_TYPE, 'success');
    assert.equal(DEFAULT_UI_TOAST_TEST_ID, 'toast-message');
    assert.equal(DEFAULT_UI_TOAST_AUTO_DISMISS_MS, 3000);
    assert.equal(DEFAULT_UI_TOAST_STACK_LIMIT, 5);
  });

  it('reads toast types with a safe fallback', () => {
    assert.equal(isUiToastType('warning'), true);
    assert.equal(isUiToastType('danger'), false);
    assert.equal(readUiToastType('info'), 'info');
    assert.equal(readUiToastType('danger'), 'success');
    assert.equal(readUiToastType(undefined, 'error'), 'error');
  });

  it('appends toast items while enforcing a stack limit', () => {
    const items: UiToastItem<string>[] = [
      { id: '1', message: 'one', type: 'info' },
      { id: '2', message: 'two', type: 'warning' },
    ];

    assert.deepEqual(
      appendUiToastItem(items, { id: '3', message: 'three', type: 'success' }, 2),
      [
        { id: '2', message: 'two', type: 'warning' },
        { id: '3', message: 'three', type: 'success' },
      ],
    );
    assert.deepEqual(
      appendUiToastItem(items, { id: '3', message: 'three', type: 'success' }, 0),
      [
        { id: '1', message: 'one', type: 'info' },
        { id: '2', message: 'two', type: 'warning' },
        { id: '3', message: 'three', type: 'success' },
      ],
    );
  });
});
