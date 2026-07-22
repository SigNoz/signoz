import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { AllTheProviders } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useLogsData } from '../useLogsData';

describe('useLogsData', () => {
	// Public dashboards redact the widget query (orderBy/filter/limit stripped),
	// so a LIST query can arrive with no orderBy — the hook must not crash on it.
	it('does not crash when the query has no orderBy', () => {
		const stagedQuery = {
			builder: {
				queryData: [{ dataSource: 'logs', queryName: 'A', disabled: false }],
			},
		} as unknown as Query;

		const { result } = renderHook(
			() =>
				useLogsData({
					result: undefined,
					panelType: PANEL_TYPES.LIST,
					stagedQuery,
				}),
			{ wrapper: AllTheProviders },
		);

		expect(result.current.logs).toStrictEqual([]);
	});
});
