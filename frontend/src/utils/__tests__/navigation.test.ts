import { isModifierKeyPressed } from '../app';
import { openExternalLink, openInNewTab } from '../navigation';

// Mock history before importing navigation so history.createHref is controlled.
jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		createHref: jest.fn(
			({
				pathname,
				search,
				hash,
			}: {
				pathname: string;
				search?: string;
				hash?: string;
			}) => `/signoz${pathname}${search || ''}${hash || ''}`,
		),
	},
}));

const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
	value: mockWindowOpen,
	writable: true,
});

describe('openInNewTab', () => {
	beforeEach(() => mockWindowOpen.mockClear());

	// Previously: window.open(path, '_blank') — no base path prepended.
	// Now: internal paths go through history.createHref so sub-path
	// deployments (e.g. /signoz/) are handled correctly.

	it('prepends base path to internal path via history.createHref', () => {
		openInNewTab('/dashboard');
		expect(mockWindowOpen).toHaveBeenCalledWith('/signoz/dashboard', '_blank');
	});

	it('preserves query string when prepending base path', () => {
		openInNewTab('/alerts?tab=AlertRules&relativeTime=30m');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'/signoz/alerts?tab=AlertRules&relativeTime=30m',
			'_blank',
		);
	});

	it('preserves hash when prepending base path', () => {
		openInNewTab('/dashboard/123#panel-5');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'/signoz/dashboard/123#panel-5',
			'_blank',
		);
	});

	// External URLs bypass createHref and are passed through as-is.
	it('passes http URL directly to window.open without base path', () => {
		openInNewTab('https://example.com/page');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'https://example.com/page',
			'_blank',
		);
	});

	it('passes protocol-relative URL directly to window.open without base path', () => {
		openInNewTab('//cdn.example.com/asset.js');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'//cdn.example.com/asset.js',
			'_blank',
		);
	});
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

describe('openExternalLink', () => {
	beforeEach(() => mockWindowOpen.mockClear());

	// openExternalLink is new — replaces ad-hoc window.open calls for external
	// URLs and always adds noopener,noreferrer for security.

	it('opens external URL with noopener,noreferrer', () => {
		openExternalLink('https://signoz.io/slack');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'https://signoz.io/slack',
			'_blank',
			'noopener,noreferrer',
		);
	});

	it('opens protocol-relative external URL with noopener,noreferrer', () => {
		openExternalLink('//docs.signoz.io/setup');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'//docs.signoz.io/setup',
			'_blank',
			'noopener,noreferrer',
		);
	});
});
