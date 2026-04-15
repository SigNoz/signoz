// Mock history before importing navigation, so history.createHref is controlled.
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

import { openExternalLink, openInNewTab } from './navigation';

const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
	value: mockWindowOpen,
	writable: true,
});

describe('openInNewTab', () => {
	beforeEach(() => mockWindowOpen.mockClear());

	it('opens external http URL as-is without prepending base path', () => {
		openInNewTab('https://signoz.io/docs');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'https://signoz.io/docs',
			'_blank',
		);
	});

	it('opens external protocol-relative URL as-is', () => {
		openInNewTab('//cdn.example.com/asset.js');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'//cdn.example.com/asset.js',
			'_blank',
		);
	});

	it('prepends base path to internal path via history.createHref', () => {
		openInNewTab('/traces');
		expect(mockWindowOpen).toHaveBeenCalledWith('/signoz/traces', '_blank');
	});

	it('preserves query string when prepending base path', () => {
		openInNewTab('/traces?service=frontend&env=prod');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'/signoz/traces?service=frontend&env=prod',
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

	it('handles path without leading slash by resolving against origin', () => {
		openInNewTab('traces');
		// new URL('traces', window.location.origin) resolves to origin + '/traces'
		// history.createHref is called with pathname: '/traces'
		expect(mockWindowOpen).toHaveBeenCalledWith('/signoz/traces', '_blank');
	});
});

describe('openExternalLink', () => {
	beforeEach(() => mockWindowOpen.mockClear());

	it('opens external URL with noopener,noreferrer', () => {
		openExternalLink('https://signoz.io/slack');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'https://signoz.io/slack',
			'_blank',
			'noopener,noreferrer',
		);
	});

	it('opens protocol-relative external URL', () => {
		openExternalLink('//docs.signoz.io/setup');
		expect(mockWindowOpen).toHaveBeenCalledWith(
			'//docs.signoz.io/setup',
			'_blank',
			'noopener,noreferrer',
		);
	});
});
