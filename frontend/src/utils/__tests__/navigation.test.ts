import {
	isModifierKeyPressed,
	navigateToPage,
	openInNewTab,
} from '../navigation';

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

	describe('navigateToPage', () => {
		const mockNavigate = jest.fn() as jest.MockedFunction<(path: string) => void>;

		beforeEach(() => {
			mockNavigate.mockClear();
		});

		it('opens new tab when metaKey is pressed', () => {
			const event = { metaKey: true, ctrlKey: false } as MouseEvent;
			navigateToPage('/services', mockNavigate, event);

			expect(window.open).toHaveBeenCalledWith('/services', '_blank');
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it('opens new tab when ctrlKey is pressed', () => {
			const event = { metaKey: false, ctrlKey: true } as MouseEvent;
			navigateToPage('/services', mockNavigate, event);

			expect(window.open).toHaveBeenCalledWith('/services', '_blank');
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it('calls navigate callback when no modifier key is pressed', () => {
			const event = { metaKey: false, ctrlKey: false } as MouseEvent;
			navigateToPage('/services', mockNavigate, event);

			expect(mockNavigate).toHaveBeenCalledWith('/services');
			expect(window.open).not.toHaveBeenCalled();
		});

		it('calls navigate callback when no event is provided', () => {
			navigateToPage('/services', mockNavigate);

			expect(mockNavigate).toHaveBeenCalledWith('/services');
			expect(window.open).not.toHaveBeenCalled();
		});

		it('calls navigate callback when event is undefined', () => {
			navigateToPage('/dashboard', mockNavigate, undefined);

			expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
			expect(window.open).not.toHaveBeenCalled();
		});
	});
});
