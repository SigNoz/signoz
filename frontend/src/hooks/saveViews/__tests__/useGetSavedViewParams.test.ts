import { renderHook } from '@testing-library/react';
import useUrlQuery from 'hooks/useUrlQuery';

import { useGetSavedViewParams } from '../useGetSavedViewParams';

jest.mock('hooks/useUrlQuery');

const mockedUseUrlQuery = useUrlQuery as jest.Mock;

const setSearch = (search: string): void => {
	mockedUseUrlQuery.mockReturnValue(new URLSearchParams(search));
};

describe('useGetSavedViewParams', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns empty strings when no params are present', () => {
		setSearch('');

		const { result } = renderHook(() => useGetSavedViewParams());

		expect(result.current).toStrictEqual({ viewName: '', viewKey: '' });
	});

	it('parses JSON-stringified values', () => {
		setSearch(
			`viewName=${encodeURIComponent(
				JSON.stringify('Hindsight'),
			)}&viewKey=${encodeURIComponent(JSON.stringify('abc-123'))}`,
		);

		const { result } = renderHook(() => useGetSavedViewParams());

		expect(result.current).toStrictEqual({
			viewName: 'Hindsight',
			viewKey: 'abc-123',
		});
	});

	it('falls back to the raw string when a value is not valid JSON', () => {
		setSearch('viewName=Hindsight&viewKey=some-uuid-value');

		const { result } = renderHook(() => useGetSavedViewParams());

		expect(result.current).toStrictEqual({
			viewName: 'Hindsight',
			viewKey: 'some-uuid-value',
		});
	});

	it('does not throw and keeps the raw string for non-string JSON', () => {
		setSearch('viewName=123');

		const { result } = renderHook(() => useGetSavedViewParams());

		expect(result.current).toStrictEqual({ viewName: '123', viewKey: '' });
	});
});
