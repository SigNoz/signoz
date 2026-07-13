import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import { resolveSignal } from '../getBuilderQueries';

function builderQuery(signal: string): DashboardtypesQueryDTO {
	return {
		spec: { plugin: { kind: 'signoz/BuilderQuery', spec: { signal } } },
	} as unknown as DashboardtypesQueryDTO;
}

const promqlQuery = {
	spec: { plugin: { kind: 'signoz/PromQuery', spec: { query: 'up' } } },
} as unknown as DashboardtypesQueryDTO;

describe('resolveSignal', () => {
	const DEFAULT = TelemetrytypesSignalDTO.metrics;

	it("uses the first builder query's signal when present", () => {
		expect(resolveSignal([builderQuery('logs')], DEFAULT)).toBe('logs');
	});

	it('prefers the builder signal over the default', () => {
		expect(resolveSignal([builderQuery('traces')], DEFAULT)).toBe('traces');
	});

	it('stays undefined when queries exist but none are builder queries (PromQL/ClickHouse)', () => {
		expect(resolveSignal([promqlQuery], DEFAULT)).toBeUndefined();
	});
});
