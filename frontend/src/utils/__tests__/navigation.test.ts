import { isModifierKeyPressed } from '../app';
import { openInNewTab } from '../navigation';

describe('navigation utilities', () => {
	const originalWindowOpen = window.open;

	beforeEach(() => {
		window.open = jest.fn();
	});

	afterEach(() => {
		window.open = originalWindowOpen;
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
		it('calls window.open with the given path and _blank target', () => {
			openInNewTab('/dashboard');
			expect(window.open).toHaveBeenCalledWith('/dashboard', '_blank');
		});

		it('handles full URLs', () => {
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
});
