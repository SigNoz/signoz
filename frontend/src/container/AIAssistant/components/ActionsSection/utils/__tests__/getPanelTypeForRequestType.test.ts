import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';

import {
	getPanelTypeForRequestType,
	requestTypeFromActionQuery,
} from '../getPanelTypeForRequestType';

describe('getPanelTypeForRequestType', () => {
	it.each([
		[Querybuildertypesv5RequestTypeDTO.scalar, PANEL_TYPES.TABLE],
		[Querybuildertypesv5RequestTypeDTO.time_series, PANEL_TYPES.TIME_SERIES],
		[Querybuildertypesv5RequestTypeDTO.raw, PANEL_TYPES.LIST],
	])('maps %s to the %s view', (requestType, view) => {
		expect(getPanelTypeForRequestType(requestType)).toBe(view);
	});

	it.each([
		undefined,
		null,
		'',
		Querybuildertypesv5RequestTypeDTO.trace,
		Querybuildertypesv5RequestTypeDTO.raw_stream,
		Querybuildertypesv5RequestTypeDTO.heatmap,
		'distribution',
		'nonsense',
		'toString',
		'constructor',
		42,
		{},
	])(
		'falls back to the List view for unmapped or invalid requestType (%p)',
		(value) => {
			expect(getPanelTypeForRequestType(value)).toBe(PANEL_TYPES.LIST);
		},
	);
});

describe('requestTypeFromActionQuery', () => {
	it('reads the requestType envelope field and returns undefined when absent', () => {
		expect(
			requestTypeFromActionQuery({
				requestType: 'scalar',
				schemaVersion: 'v5',
				compositeQuery: { queries: [] },
			}),
		).toBe('scalar');
		expect(requestTypeFromActionQuery({})).toBeUndefined();
		expect(requestTypeFromActionQuery(null)).toBeUndefined();
		expect(requestTypeFromActionQuery(undefined)).toBeUndefined();
	});

	it('maps a grouped count() payload to the Table view', () => {
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
