import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import type { AggregateData } from 'container/QueryTable/Drilldown/useAggregateDrilldown';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useDrilldownBreakout } from '../useDrilldownBreakout';

jest.mock('api/common/logEvent', () => jest.fn());
jest.mock('container/QueryTable/Drilldown/tableDrilldownUtils', () => ({
	...jest.requireActual('container/QueryTable/Drilldown/tableDrilldownUtils'),
	getBreakoutQuery: jest.fn((query: Query) => query),
}));

const QUERY = {
	queryType: 'builder',
	builder: { queryData: [{ queryName: 'A' }], queryFormulas: [] },
} as unknown as Query;
const AGGREGATE = { queryName: 'A', filters: [] } as unknown as AggregateData;

function breakOutFrom(panelType: PANEL_TYPES): PANEL_TYPES {
	const openViewWithQuery = jest.fn();
	const { result } = renderHook(() =>
		useDrilldownBreakout({
			panelId: 'p1',
			v1Query: QUERY,
			panelType,
			aggregateData: AGGREGATE,
			openViewWithQuery,
			onClose: jest.fn(),
		}),
	);
	result.current.onBreakout({ name: 'host.name' } as never);
	return openViewWithQuery.mock.calls[0][2];
}

describe('useDrilldownBreakout', () => {
	it('opens a scatter plot breakout as a table', () => {
		expect(breakOutFrom(PANEL_TYPES.SCATTER)).toBe(PANEL_TYPES.TABLE);
	});

	it('keeps the panel type for the kinds V1 breaks out in place', () => {
		expect(breakOutFrom(PANEL_TYPES.TIME_SERIES)).toBe(PANEL_TYPES.TIME_SERIES);
		expect(breakOutFrom(PANEL_TYPES.VALUE)).toBe(PANEL_TYPES.TABLE);
	});
});
