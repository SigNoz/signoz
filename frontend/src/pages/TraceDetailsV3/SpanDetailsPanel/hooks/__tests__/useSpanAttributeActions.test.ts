import { renderHook } from '@testing-library/react';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	SPAN_ACTION,
	useSpanAttributeActions,
} from '../useSpanAttributeActions';

const mockRedirect = jest.fn();

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({
		currentQuery: initialQueriesMap.traces,
		redirectWithQueryBuilderData: mockRedirect,
	}),
}));

const runAction = (
	value: string,
	args: { key: string; value: string },
): Query => {
	const { result } = renderHook(() => useSpanAttributeActions());
	const action = result.current.find((a) => a.value === value);
	if (!action) {
		throw new Error(`action ${value} not found`);
	}
	action.callback(args);
	expect(mockRedirect).toHaveBeenCalledTimes(1);
	return mockRedirect.mock.calls[0][0] as Query;
};

describe('useSpanAttributeActions', () => {
	beforeEach(() => {
		mockRedirect.mockClear();
	});

	it('filter for value redirects to the traces list with the key applied', () => {
		const query = runAction(SPAN_ACTION.FILTER_IN, {
			key: 'http.status_code',
			value: '500',
		});

		const queryData = query.builder.queryData[0];
		const item = queryData.filters?.items.at(-1);
		expect(item?.key?.key).toBe('http.status_code');
		expect(item?.op).toBe('=');
		expect(item?.value).toBe('500');
		expect(queryData.filter?.expression).toBe("http.status_code = '500'");
		expect(mockRedirect.mock.calls[0][1]).toStrictEqual({
			panelTypes: PANEL_TYPES.LIST,
		});
		expect(mockRedirect.mock.calls[0][2]).toBe(ROUTES.TRACES_EXPLORER);
	});

	it('filter out value negates the clause', () => {
		const query = runAction(SPAN_ACTION.FILTER_OUT, {
			key: 'service.name',
			value: 'frontend',
		});

		const queryData = query.builder.queryData[0];
		expect(queryData.filters?.items.at(-1)?.op).toBe('!=');
		expect(queryData.filter?.expression).toBe("service.name != 'frontend'");
	});

	it('group by attribute redirects to the time series view with the bare key', () => {
		const query = runAction(SPAN_ACTION.GROUP_BY, {
			key: 'service.name',
			value: 'frontend',
		});

		const groupBy = query.builder.queryData[0].groupBy.at(-1);
		expect(groupBy).toMatchObject({
			key: 'service.name',
			dataType: '',
			type: '',
		});
		expect(mockRedirect.mock.calls[0][1]).toStrictEqual({
			panelTypes: PANEL_TYPES.TIME_SERIES,
		});
		expect(mockRedirect.mock.calls[0][2]).toBe(ROUTES.TRACES_EXPLORER);
	});
});
