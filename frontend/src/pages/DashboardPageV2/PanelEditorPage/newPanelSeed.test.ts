import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { isQueryTypeSupportedByPanelKind } from '../DashboardContainer/Panels/capabilities';
import { getPanelDefinition } from '../DashboardContainer/Panels/registry';
import { SectionKind } from '../DashboardContainer/Panels/types/sections';
import { buildDefaultQueries } from '../DashboardContainer/Panels/utils/buildDefaultQueries';
import { buildPluginSpec } from '../DashboardContainer/Panels/utils/buildPluginSpec';
import { toPerses } from '../DashboardContainer/queryV5/persesQueryAdapters';
import { buildNewPanelSeed } from './newPanelSeed';

jest.mock('../DashboardContainer/queryV5/persesQueryAdapters', () => ({
	toPerses: jest.fn(),
}));
jest.mock('../DashboardContainer/Panels/utils/buildDefaultQueries', () => ({
	buildDefaultQueries: jest.fn(),
}));
jest.mock('../DashboardContainer/Panels/utils/buildPluginSpec', () => ({
	buildPluginSpec: jest.fn(),
}));
jest.mock('../DashboardContainer/Panels/registry', () => ({
	getPanelDefinition: jest.fn(),
}));
jest.mock('../DashboardContainer/Panels/capabilities', () => ({
	isQueryTypeSupportedByPanelKind: jest.fn(),
}));

const mockToPerses = toPerses as jest.Mock;
const mockBuildDefaultQueries = buildDefaultQueries as jest.Mock;
const mockBuildPluginSpec = buildPluginSpec as jest.Mock;
const mockGetPanelDefinition = getPanelDefinition as jest.Mock;
const mockIsQueryTypeSupported = isQueryTypeSupportedByPanelKind as jest.Mock;

const DEFAULT_QUERIES = [{ kind: 'default' }];
const CONVERTED_QUERIES = [{ kind: 'converted' }];
const BASE_SPEC = { visualization: { foo: 1 } };

const withUnit = [{ kind: SectionKind.Formatting, controls: { unit: true } }];
const withoutUnit = [
	{ kind: SectionKind.Formatting, controls: { decimals: true } },
];

const q = (extra: Partial<Query> = {}): Query =>
	({ queryType: 'builder', ...extra }) as unknown as Query;

describe('buildNewPanelSeed', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockBuildDefaultQueries.mockReturnValue(DEFAULT_QUERIES);
		mockBuildPluginSpec.mockReturnValue(BASE_SPEC);
		mockGetPanelDefinition.mockReturnValue({ sections: withUnit });
		mockIsQueryTypeSupported.mockReturnValue(true);
	});

	it('uses the kind default seed when it is not an explorer export', () => {
		const seed = buildNewPanelSeed('signoz/TimeSeriesPanel', null);

		expect(seed.kind).toBe('signoz/TimeSeriesPanel');
		expect(seed.queries).toBe(DEFAULT_QUERIES);
		expect(seed.pluginSpec).toStrictEqual(BASE_SPEC);
		expect(mockToPerses).not.toHaveBeenCalled();
	});

	it('converts the exported query into perses queries', () => {
		mockToPerses.mockReturnValue(CONVERTED_QUERIES);

		const seed = buildNewPanelSeed('signoz/TimeSeriesPanel', q(), true);

		expect(seed.kind).toBe('signoz/TimeSeriesPanel');
		expect(seed.queries).toBe(CONVERTED_QUERIES);
		expect(seed.pluginSpec).toStrictEqual(BASE_SPEC);
	});

	it('coerces a builder-only kind to Table for a ClickHouse query', () => {
		mockIsQueryTypeSupported.mockReturnValue(false);
		mockToPerses.mockReturnValue(CONVERTED_QUERIES);

		const seed = buildNewPanelSeed(
			'signoz/ListPanel',
			q({ queryType: EQueryType.CLICKHOUSE }),
			true,
		);

		expect(seed.kind).toBe('signoz/TablePanel');
		expect(seed.queries).toBe(CONVERTED_QUERIES);
	});

	it('coerces a builder-only kind to TimeSeries for a PromQL query', () => {
		mockIsQueryTypeSupported.mockReturnValue(false);
		mockToPerses.mockReturnValue(CONVERTED_QUERIES);

		const seed = buildNewPanelSeed(
			'signoz/ListPanel',
			q({ queryType: EQueryType.PROM }),
			true,
		);

		expect(seed.kind).toBe('signoz/TimeSeriesPanel');
		expect(seed.queries).toBe(CONVERTED_QUERIES);
	});

	it('falls back to the default seed when conversion yields nothing runnable', () => {
		mockToPerses.mockReturnValue([]);

		const seed = buildNewPanelSeed('signoz/ListPanel', q(), true);

		expect(seed.queries).toBe(DEFAULT_QUERIES);
	});

	it('preserves the exported unit when the kind supports a unit', () => {
		mockToPerses.mockReturnValue(CONVERTED_QUERIES);
		mockGetPanelDefinition.mockReturnValue({ sections: withUnit });

		const seed = buildNewPanelSeed(
			'signoz/TimeSeriesPanel',
			q({ unit: 'ms' }),
			true,
		);

		expect(seed.pluginSpec).toStrictEqual({
			...BASE_SPEC,
			formatting: { unit: 'ms' },
		});
	});

	it('drops the unit for a kind without a unit control', () => {
		mockToPerses.mockReturnValue(CONVERTED_QUERIES);
		mockGetPanelDefinition.mockReturnValue({ sections: withoutUnit });

		const seed = buildNewPanelSeed('signoz/TablePanel', q({ unit: 'ms' }), true);

		expect(seed.pluginSpec).toStrictEqual(BASE_SPEC);
	});
});
