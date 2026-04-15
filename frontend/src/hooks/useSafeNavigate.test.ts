import React from 'react';
import { MemoryRouter } from 'react-router-dom-v5-compat';
import { renderHook } from '@testing-library/react';

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

import history from 'lib/history';

import { useSafeNavigate } from './useSafeNavigate';

function renderSafeNavigate(): ReturnType<typeof useSafeNavigate> {
	const { result } = renderHook(() => useSafeNavigate(), {
		wrapper: ({ children }: { children: React.ReactNode }) =>
			React.createElement(MemoryRouter, { initialEntries: ['/home'] }, children),
	});
	return result.current;
}

describe('useSafeNavigate — newTab option', () => {
	let windowOpenSpy: jest.SpyInstance;

	beforeEach(() => {
		windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(jest.fn());
		jest.clearAllMocks();
	});

	afterEach(() => {
		windowOpenSpy.mockRestore();
	});

	it('opens string path in new tab with base path prepended', () => {
		const { safeNavigate } = renderSafeNavigate();
		safeNavigate('/traces', { newTab: true });
		expect(windowOpenSpy).toHaveBeenCalledWith('/signoz/traces', '_blank');
		expect(history.createHref).toHaveBeenCalledWith({
			pathname: '/traces',
			search: '',
			hash: '',
		});
	});

	it('preserves query string when opening in new tab', () => {
		const { safeNavigate } = renderSafeNavigate();
		safeNavigate('/traces?service=api', { newTab: true });
		expect(windowOpenSpy).toHaveBeenCalledWith(
			'/signoz/traces?service=api',
			'_blank',
		);
		expect(history.createHref).toHaveBeenCalledWith({
			pathname: '/traces',
			search: '?service=api',
			hash: '',
		});
	});

	it('opens object-form path in new tab with base path prepended', () => {
		const { safeNavigate } = renderSafeNavigate();
		safeNavigate({ pathname: '/logs', search: '?env=prod' }, { newTab: true });
		expect(windowOpenSpy).toHaveBeenCalledWith('/signoz/logs?env=prod', '_blank');
		expect(history.createHref).toHaveBeenCalledWith({
			pathname: '/logs',
			search: '?env=prod',
		});
	});

	it('passes external URL directly to window.open without createHref', () => {
		const { safeNavigate } = renderSafeNavigate();
		safeNavigate('https://docs.signoz.io/page', { newTab: true });
		expect(windowOpenSpy).toHaveBeenCalledWith(
			'https://docs.signoz.io/page',
			'_blank',
		);
		expect(history.createHref).not.toHaveBeenCalled();
	});
});
