/**
 * Fixture-driven round-trip suite. Loads the canonical perses dashboard testdata
 * the Go backend uses to validate its serialization, then for each panel runs:
 *
 *   fromPerses(panel.queries) → V1 Query → toPerses(query, graphType) → DTO
 *
 * and asserts the structural fields that should survive the round trip. This
 * covers real-world panel/query combinations the synthetic unit tests miss.
 */
import fs from 'fs';
import path from 'path';
import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types';

import { fromPerses } from '../fromPerses';
import { toPerses } from '../toPerses';

jest.mock('lib/getStartEndRangeTime', () => ({
	__esModule: true,
	default: jest.fn(() => ({ start: '100', end: '200' })),
}));

const TESTDATA_PATH = path.join(
	__dirname,
	'../../../../../../../pkg/types/dashboardtypes/testdata/perses.json',
);

interface PersesPanel {
	spec?: {
		plugin?: { kind?: string };
		queries?: DashboardtypesQueryDTO[];
	};
}

interface PersesDashboardSpec {
	panels?: Record<string, PersesPanel | null>;
}

interface FixturePanel {
	panelId: string;
	panelKind: string;
	innerKind: string;
	query: DashboardtypesQueryDTO;
}

function loadFixturePanels(): FixturePanel[] {
	const raw = fs.readFileSync(TESTDATA_PATH, 'utf8');
	const data = JSON.parse(raw) as PersesDashboardSpec;
	const panels = data.panels ?? {};

	return Object.entries(panels).flatMap(([panelId, panel]) => {
		const panelKind = panel?.spec?.plugin?.kind;
		const query = panel?.spec?.queries?.[0];
		const innerKind = (query?.spec?.plugin as { kind?: string } | undefined)
			?.kind;
		if (!panelKind || !query || !innerKind) {
			return [];
		}
		return [{ panelId, panelKind, innerKind, query }];
	});
}

describe('round-trip: perses.json testdata → fromPerses → toPerses', () => {
	const fixturePanels = loadFixturePanels();

	it('testdata loaded with expected coverage', () => {
		expect(fixturePanels.length).toBeGreaterThan(0);
		// Sanity: at least TimeSeriesPanel + BuilderQuery is present in the testdata.
		expect(
			fixturePanels.some(
				(p) =>
					p.panelKind === 'signoz/TimeSeriesPanel' &&
					p.innerKind === 'signoz/BuilderQuery',
			),
		).toBe(true);
	});

	it.each(fixturePanels)(
		'panel $panelId ($panelKind / $innerKind) survives round-trip',
		({ panelKind, query }) => {
			const graphType =
				PANEL_KIND_TO_PANEL_TYPE[panelKind as PanelKind] ?? PANEL_TYPES.TIME_SERIES;

			const v1 = fromPerses([query]);
			const roundTripped = toPerses({ query: v1, graphType });

			expect(roundTripped).toHaveLength(1);
			expect(roundTripped[0].kind).toBe(query.kind);

			const origPlugin = (query.spec?.plugin ?? {}) as {
				kind?: string;
				spec?: Record<string, unknown>;
			};
			const rtPlugin = (roundTripped[0].spec?.plugin ?? {}) as {
				kind?: string;
				spec?: Record<string, unknown>;
			};

			expect(rtPlugin.kind).toBe(origPlugin.kind);

			const oSpec = origPlugin.spec ?? {};
			const rSpec = rtPlugin.spec ?? {};

			switch (origPlugin.kind) {
				case 'signoz/BuilderQuery':
					expectBuilderShapePreserved(oSpec, rSpec);
					break;
				case 'signoz/CompositeQuery':
					expectCompositeShapePreserved(oSpec, rSpec);
					break;
				case 'signoz/PromQLQuery':
				case 'signoz/ClickHouseSQL':
					expectNamedQueryPreserved(oSpec, rSpec);
					break;
				default:
					break;
			}
		},
	);
});

// ---- assertion helpers -----------------------------------------------------

function namesOrEmpty(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return (value as Array<{ name?: string }>).map((g) => g.name ?? '');
}

function orderColumnsOrEmpty(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return (value as Array<{ key?: { name?: string } }>).map(
		(o) => o.key?.name ?? '',
	);
}

function expectBuilderShapePreserved(
	original: Record<string, unknown>,
	roundTripped: Record<string, unknown>,
): void {
	expect(roundTripped.name).toBe(original.name);
	expect(roundTripped.signal).toBe(original.signal);

	const origFilterExpr = (original.filter as { expression?: string } | undefined)
		?.expression;
	const rtFilterExpr = (
		roundTripped.filter as { expression?: string } | undefined
	)?.expression;
	expect(rtFilterExpr ?? '').toBe(origFilterExpr ?? '');

	expect(namesOrEmpty(roundTripped.groupBy)).toStrictEqual(
		namesOrEmpty(original.groupBy),
	);
	expect(orderColumnsOrEmpty(roundTripped.order)).toStrictEqual(
		orderColumnsOrEmpty(original.order),
	);
}

function expectCompositeShapePreserved(
	original: Record<string, unknown>,
	roundTripped: Record<string, unknown>,
): void {
	const origSubs =
		(original.queries as Array<{ type: string }> | undefined) ?? [];
	const rtSubs =
		(roundTripped.queries as Array<{ type: string }> | undefined) ?? [];
	expect(rtSubs).toHaveLength(origSubs.length);
	expect(rtSubs.map((s) => s.type).sort()).toStrictEqual(
		origSubs.map((s) => s.type).sort(),
	);
}

function expectNamedQueryPreserved(
	original: Record<string, unknown>,
	roundTripped: Record<string, unknown>,
): void {
	expect(roundTripped.name).toBe(original.name);
	expect(roundTripped.query).toBe(original.query);
}
