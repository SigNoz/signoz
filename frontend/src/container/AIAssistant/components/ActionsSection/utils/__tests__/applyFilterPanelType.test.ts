import { PANEL_TYPES } from 'constants/queryBuilder';

import {
	getPanelTypeForRequestType,
	requestTypeFromActionQuery,
} from '../applyFilterPanelType';

describe('getPanelTypeForRequestType', () => {
	it('maps scalar (grouped aggregation) to the Table view', () => {
		expect(getPanelTypeForRequestType('scalar')).toBe(PANEL_TYPES.TABLE);
	});

	it('maps time_series to the Time Series (graph) view', () => {
		expect(getPanelTypeForRequestType('time_series')).toBe(
			PANEL_TYPES.TIME_SERIES,
		);
	});

	it('maps distribution (aggregation) to the Table view', () => {
		expect(getPanelTypeForRequestType('distribution')).toBe(PANEL_TYPES.TABLE);
	});

	it('maps raw to the List view', () => {
		expect(getPanelTypeForRequestType('raw')).toBe(PANEL_TYPES.LIST);
	});

	it.each([undefined, null, '', 'trace', 'nonsense', 42, {}])(
		'defaults to the List view for raw/unknown/missing requestType (%p)',
		(value) => {
			expect(getPanelTypeForRequestType(value)).toBe(PANEL_TYPES.LIST);
		},
	);
});

describe('requestTypeFromActionQuery', () => {
	it('reads the top-level requestType envelope field', () => {
		expect(
			requestTypeFromActionQuery({
				requestType: 'scalar',
				schemaVersion: 'v5',
				compositeQuery: { queries: [] },
			}),
		).toBe('scalar');
	});

	it('returns undefined when the field or query is absent', () => {
		expect(requestTypeFromActionQuery({})).toBeUndefined();
		expect(requestTypeFromActionQuery(null)).toBeUndefined();
		expect(requestTypeFromActionQuery(undefined)).toBeUndefined();
	});

	it('composes with getPanelTypeForRequestType for the reported bug payload', () => {
		// The "log count by service" apply_filter payload from issue #304 follow-up:
		// scalar + groupBy(service.name) must open the Table view, not List.
		const query = {
			requestType: 'scalar',
			schemaVersion: 'v5',
			compositeQuery: {
				queries: [
					{
						type: 'builder_query',
						spec: {
							signal: 'logs',
							aggregations: [{ expression: 'count()' }],
							groupBy: [{ name: 'service.name' }],
						},
					},
				],
			},
		};
		expect(getPanelTypeForRequestType(requestTypeFromActionQuery(query))).toBe(
			PANEL_TYPES.TABLE,
		);
	});
});
