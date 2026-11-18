import { renderHook } from '@testing-library/react';
import { initialQueriesMap } from 'constants/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useActiveLog } from '../useActiveLog';

const mockRedirect = jest.fn();

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({
		currentQuery: initialQueriesMap.logs,
		redirectWithQueryBuilderData: mockRedirect,
	}),
}));

jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): URLSearchParams => new URLSearchParams(),
}));

describe('useActiveLog', () => {
	beforeEach(() => {
		mockRedirect.mockClear();
	});

	it('adds the chip field as a filter with its data type and redirects', () => {
		const { result } = renderHook(() => useActiveLog());

		result.current.onAddToQuery(
			'service.name',
			'frontend',
			'=',
			DataTypes.String,
		);

		expect(mockRedirect).toHaveBeenCalledTimes(1);
		const query = mockRedirect.mock.calls[0][0] as Query;
		const item = query.builder.queryData[0].filters?.items.at(-1);
		expect(item?.key).toMatchObject({
			key: 'service.name',
			dataType: DataTypes.String,
			type: '',
		});
		expect(item?.op).toBe('=');
		expect(item?.value).toBe('frontend');
	});

	it('keeps the existing filter items ahead of the new one', () => {
		const { result } = renderHook(() => useActiveLog());

		result.current.onAddToQuery('k8s.pod.name', 'pod-1', '=');

		const query = mockRedirect.mock.calls[0][0] as Query;
		const items = query.builder.queryData[0].filters?.items ?? [];
		expect(items).toHaveLength(
			(initialQueriesMap.logs.builder.queryData[0].filters?.items.length ?? 0) + 1,
		);
		expect(items.at(-1)?.key?.key).toBe('k8s.pod.name');
	});
});
