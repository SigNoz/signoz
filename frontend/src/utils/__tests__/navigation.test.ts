import { isModifierKeyPressed } from '../app';

type NavigationModule = typeof import('../navigation');

function loadNavigationModule(href?: string): NavigationModule {
	if (href !== undefined) {
		const base = document.createElement('base');
		base.setAttribute('href', href);
		document.head.appendChild(base);
	}
	let mod!: NavigationModule;
	jest.isolateModules(() => {
		// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
		mod = require('../navigation');
	});
	return mod;
}

describe('navigation utilities', () => {
	const originalWindowOpen = window.open;

	afterEach(() => {
		window.open = originalWindowOpen;
		document.head.querySelectorAll('base').forEach((el) => el.remove());
	});

	describe('isModifierKeyPressed', () => {
		const createMouseEvent = (overrides: Partial<MouseEvent> = {}): MouseEvent =>
			({
				metaKey: false,
				ctrlKey: false,
				button: 0,
				...overrides,
			} as MouseEvent);

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
			let m: NavigationModule;
			beforeEach(() => {
				window.open = jest.fn();
				m = loadNavigationModule('/');
			});

			it('passes internal path through unchanged', () => {
				m.openInNewTab('/dashboard');
				expect(window.open).toHaveBeenCalledWith('/dashboard', '_blank');
			});

			it('passes through external URLs unchanged', () => {
				m.openInNewTab('https://example.com/page');
				expect(window.open).toHaveBeenCalledWith(
					'https://example.com/page',
					'_blank',
				);
			});

			it('handles paths with query strings', () => {
				m.openInNewTab('/alerts?tab=AlertRules&relativeTime=30m');
				expect(window.open).toHaveBeenCalledWith(
					'/alerts?tab=AlertRules&relativeTime=30m',
					'_blank',
				);
			});
		});

		describe('at basePath="/signoz/"', () => {
			let m: NavigationModule;
			beforeEach(() => {
				window.open = jest.fn();
				m = loadNavigationModule('/signoz/');
			});

			it('prepends base path to internal paths', () => {
				m.openInNewTab('/dashboard');
				expect(window.open).toHaveBeenCalledWith('/signoz/dashboard', '_blank');
			});

			it('passes through external URLs unchanged', () => {
				m.openInNewTab('https://example.com/page');
				expect(window.open).toHaveBeenCalledWith(
					'https://example.com/page',
					'_blank',
				);
			});

			it('is idempotent — does not double-prefix an already-prefixed path', () => {
				m.openInNewTab('/signoz/dashboard');
				expect(window.open).toHaveBeenCalledWith('/signoz/dashboard', '_blank');
			});
		});
	});
});
