import { isModifierKeyPressed } from '../app';
import { openInNewTab } from '../navigation';

// utils/basePath is memoized at module init and vi.resetModules() does not
// re-evaluate modules in browser mode, so per-path state is driven through a
// utils/basePath mock (mirrors the real prefix logic) instead of re-importing
// navigation with a fresh DOM state.
const { mockBasePath } = vi.hoisted(() => ({ mockBasePath: { value: '/' } }));

vi.mock('utils/basePath', async () => {
	const actual =
		await vi.importActual<typeof import('utils/basePath')>('utils/basePath');
	return {
		...actual,
		withBasePath: (path: string): string => {
			const prefix = mockBasePath.value;
			if (!path.startsWith('/')) {
				return path;
			}
			if (prefix === '/') {
				return path;
			}
			if (path.startsWith(prefix) || path === prefix.slice(0, -1)) {
				return path;
			}
			return prefix + path.slice(1);
		},
	};
});

function setBasePath(href: string): void {
	mockBasePath.value = href.endsWith('/') ? href : `${href}/`;
}

const createMouseEvent = (overrides: Partial<MouseEvent> = {}): MouseEvent =>
	({
		metaKey: false,
		ctrlKey: false,
		button: 0,
		...overrides,
	}) as MouseEvent;

describe('navigation utilities', () => {
	const originalWindowOpen = window.open;

	afterEach(() => {
		window.open = originalWindowOpen;
	});

	describe('isModifierKeyPressed', () => {
		it('returns true when metaKey is pressed (Cmd on Mac)', () => {
			const event = createMouseEvent({ metaKey: true });
			expect(isModifierKeyPressed(event)).toBe(true);
		});

		it('returns true when ctrlKey is pressed (Ctrl on Windows/Linux)', () => {
			const event = createMouseEvent({ ctrlKey: true });
			expect(isModifierKeyPressed(event)).toBe(true);
		});

		it('returns true when both metaKey and ctrlKey are pressed', () => {
			const event = createMouseEvent({ metaKey: true, ctrlKey: true });
			expect(isModifierKeyPressed(event)).toBe(true);
		});

		it('returns false when neither modifier key is pressed', () => {
			const event = createMouseEvent();
			expect(isModifierKeyPressed(event)).toBe(false);
		});

		it('returns false when only shiftKey or altKey are pressed', () => {
			const event = createMouseEvent({
				shiftKey: true,
				altKey: true,
			} as Partial<MouseEvent>);
			expect(isModifierKeyPressed(event)).toBe(false);
		});

		it('returns true when middle mouse button is used', () => {
			const event = createMouseEvent({ button: 1 });
			expect(isModifierKeyPressed(event)).toBe(true);
		});
	});

	describe('openInNewTab', () => {
		describe('at basePath="/"', () => {
			beforeEach(() => {
				vi.spyOn(window, 'open').mockImplementation(() => null);
				setBasePath('/');
			});

			it('passes internal path through unchanged', () => {
				openInNewTab('/dashboard');
				expect(window.open).toHaveBeenCalledWith('/dashboard', '_blank');
			});

			it('passes through external URLs unchanged', () => {
				openInNewTab('https://example.com/page');
				expect(window.open).toHaveBeenCalledWith(
					'https://example.com/page',
					'_blank',
				);
			});

			it('handles paths with query strings', () => {
				openInNewTab('/alerts?tab=AlertRules&relativeTime=30m');
				expect(window.open).toHaveBeenCalledWith(
					'/alerts?tab=AlertRules&relativeTime=30m',
					'_blank',
				);
			});
		});

		describe('at basePath="/signoz/"', () => {
			beforeEach(() => {
				vi.spyOn(window, 'open').mockImplementation(() => null);
				setBasePath('/signoz/');
			});

			it('prepends base path to internal paths', () => {
				openInNewTab('/dashboard');
				expect(window.open).toHaveBeenCalledWith('/signoz/dashboard', '_blank');
			});

			it('passes through external URLs unchanged', () => {
				openInNewTab('https://example.com/page');
				expect(window.open).toHaveBeenCalledWith(
					'https://example.com/page',
					'_blank',
				);
			});

			it('is idempotent — does not double-prefix an already-prefixed path', () => {
				openInNewTab('/signoz/dashboard');
				expect(window.open).toHaveBeenCalledWith('/signoz/dashboard', '_blank');
			});
		});
	});
});
