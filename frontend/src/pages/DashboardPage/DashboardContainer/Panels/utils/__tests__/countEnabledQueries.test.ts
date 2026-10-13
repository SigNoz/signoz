import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';

import { countEnabledQueries } from '../countEnabledQueries';

function compositeQuery(
	envelopes: { type: string; disabled?: boolean }[],
): DashboardtypesQueryDTO {
	return {
		spec: {
			plugin: {
				kind: 'signoz/CompositeQuery',
				spec: {
					queries: envelopes.map(({ type, disabled }) => ({
						type,
						spec: { disabled },
					})),
				},
			},
		},
	} as unknown as DashboardtypesQueryDTO;
}

function bareBuilderQuery(disabled?: boolean): DashboardtypesQueryDTO {
	return {
		spec: {
			plugin: { kind: 'signoz/BuilderQuery', spec: { signal: 'logs', disabled } },
		},
	} as unknown as DashboardtypesQueryDTO;
}

describe('countEnabledQueries', () => {
	it('returns 0 when there are no queries', () => {
		expect(countEnabledQueries([])).toBe(0);
	});

	it('counts every enabled envelope inside the composite wrapper', () => {
		expect(
			countEnabledQueries([
				compositeQuery([{ type: 'builder_query' }, { type: 'builder_query' }]),
			]),
		).toBe(2);
	});

	it('does not count disabled envelopes', () => {
		expect(
			countEnabledQueries([
				compositeQuery([
					{ type: 'builder_query' },
					{ type: 'builder_query', disabled: true },
				]),
			]),
		).toBe(1);
	});

	it('counts formula envelopes alongside builder queries', () => {
		expect(
			countEnabledQueries([
				compositeQuery([
					{ type: 'builder_query' },
					{ type: 'builder_query' },
					{ type: 'builder_formula' },
				]),
			]),
		).toBe(3);
	});

	it('treats an absent disabled flag as enabled', () => {
		expect(
			countEnabledQueries([compositeQuery([{ type: 'builder_query' }])]),
		).toBe(1);
	});

	it('unwraps a bare builder query (List panel shape)', () => {
		expect(countEnabledQueries([bareBuilderQuery()])).toBe(1);
	});

	it('does not count a disabled bare builder query', () => {
		expect(countEnabledQueries([bareBuilderQuery(true)])).toBe(0);
	});
});
