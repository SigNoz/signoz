import { renderHook } from '@testing-library/react';
import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';
import type { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import type { SyncedQueryBuilderField } from '../../../Panels/types/panelCapabilities';
import { useSyncQueryBuilderFields } from '../useSyncQueryBuilderFields';

const mockHandleSetQueryData = jest.fn();
let mockQueries: IBuilderQuery[] = [];

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({
		currentQuery: { builder: { queryData: mockQueries } },
		handleSetQueryData: mockHandleSetQueryData,
	}),
}));

const query = (queryName: string, groupBy: string[]): IBuilderQuery =>
	({
		queryName,
		groupBy: groupBy.map((name) => ({ key: name }) as BaseAutocompleteData),
		dataSource: 'traces',
	}) as IBuilderQuery;

const GROUP_BY: SyncedQueryBuilderField[] = [QueryBuilderField.GroupBy];

function setup(
	fields: SyncedQueryBuilderField[] | undefined,
	initial: IBuilderQuery[],
): (next: IBuilderQuery[]) => void {
	mockQueries = initial;
	const { rerender } = renderHook(() => useSyncQueryBuilderFields(fields));
	return (next): void => {
		mockQueries = next;
		rerender();
	};
}

describe('useSyncQueryBuilderFields', () => {
	beforeEach(() => mockHandleSetQueryData.mockClear());

	it('writes the synced value into the other queries', () => {
		const update = setup(GROUP_BY, [query('A', []), query('B', [])]);

		update([query('A', ['service.name']), query('B', [])]);

		expect(mockHandleSetQueryData).toHaveBeenCalledTimes(1);
		expect(mockHandleSetQueryData).toHaveBeenCalledWith(
			1,
			query('B', ['service.name']),
		);
	});

	it('does nothing when the kind syncs no fields', () => {
		const update = setup(undefined, [query('A', []), query('B', [])]);

		update([query('A', ['service.name']), query('B', [])]);

		expect(mockHandleSetQueryData).not.toHaveBeenCalled();
	});
});
