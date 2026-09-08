import { useCallback, useRef } from 'react';
import logEvent from 'api/common/logEvent';
import type {
	DashboardtypesPanelPluginDTO,
	DashboardtypesPanelSpecDTO,
	DashboardtypesQueryDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ATTRIBUTE_TYPES, type PANEL_TYPES } from 'constants/queryBuilder';
import {
	handleQueryChange,
	type PartialPanelTypes,
} from 'lib/query/panelQuery';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import type {
	IBuilderQuery,
	OrderByPayload,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import type {
	MetricAggregation,
	SpaceAggregation,
} from 'types/api/v5/queryRange';

import {
	isQuerylessPanelKind,
	resolveQueryType,
} from '../../Panels/capabilities';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from '../../Panels/types/panelKind';
import { getBuilderQueries } from '../../Panels/utils/getBuilderQueries';
import { toPerses } from '../../queryV5/persesQueryAdapters';
import {
	getSwitchedPluginSpec,
	type SwitchedPluginSpec,
} from '../getSwitchedPluginSpec';

// V1's handleQueryChange clears orderBy for lists; re-seed the fresh-list default (timestamp desc).
const DEFAULT_LIST_ORDER_BY: OrderByPayload[] = [
	{ columnName: 'timestamp', order: 'desc' },
];

const PERCENTILE_SPACE_AGGREGATIONS = new Set<SpaceAggregation>([
	'p50',
	'p75',
	'p90',
	'p95',
	'p99',
]);

const HISTOGRAM_ATTRIBUTE_TYPES = new Set<string>([
	ATTRIBUTE_TYPES.HISTOGRAM,
	ATTRIBUTE_TYPES.EXPONENTIAL_HISTOGRAM,
]);

const DEFAULT_HISTOGRAM_SPACE_AGGREGATION = 'p90';

function withDefaultListOrder(query: Query): Query {
	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map((qd) =>
				qd.orderBy && qd.orderBy.length > 0
					? qd
					: { ...qd, orderBy: DEFAULT_LIST_ORDER_BY },
			),
		},
	};
}

/**
 * A heatmap draws against one bucket axis, so the request takes exactly one enabled
 * query and refuses a formula over the cells. The per-kind cache restores whatever is
 * dropped here if the panel switches back.
 *
 * Percentiles go the same way: a histogram heatmap takes its axis from the `le` labels,
 * so a percentile draws the grid a count already draws, and the statement builder sums
 * either way.
 */
function withSingleHeatmapQuery(query: Query): Query {
	const [first] = query.builder.queryData;
	if (!first) {
		return query;
	}

	return {
		...query,
		builder: {
			...query.builder,
			queryData: [
				{
					...first,
					spaceAggregation: withoutPercentile(first.spaceAggregation),
					aggregations: first.aggregations?.map((aggregation) => ({
						...aggregation,
						spaceAggregation: withoutPercentile(
							(aggregation as MetricAggregation).spaceAggregation,
						),
					})) as IBuilderQuery['aggregations'],
				},
			],
			queryFormulas: [],
		},
	};
}

/** Cast because the substitute is a `SpaceAggregation` whichever of its callers `T` came from. */
function withoutPercentile<T extends string | undefined>(
	spaceAggregation: T,
): T {
	return (
		PERCENTILE_SPACE_AGGREGATIONS.has(spaceAggregation as SpaceAggregation)
			? 'sum'
			: spaceAggregation
	) as T;
}

/**
 * Undoes the sum above: every other kind offers a histogram metric percentiles alone, so
 * a sum carried out of a heatmap would sit in the selector with no option behind it.
 * Other metric types are left alone — sum is a real choice for a sum or a gauge.
 */
function withPercentileHistogramAggregation(query: Query): Query {
	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData.map((queryData) => {
				if (
					!HISTOGRAM_ATTRIBUTE_TYPES.has(queryData.aggregateAttribute?.type ?? '')
				) {
					return queryData;
				}

				return {
					...queryData,
					spaceAggregation: withoutSum(queryData.spaceAggregation),
					aggregations: queryData.aggregations?.map((aggregation) => ({
						...aggregation,
						spaceAggregation: withoutSum(
							(aggregation as MetricAggregation).spaceAggregation,
						),
					})) as IBuilderQuery['aggregations'],
				};
			}),
		},
	};
}

function withoutSum<T extends string | undefined>(spaceAggregation: T): T {
	return (
		spaceAggregation === 'sum'
			? DEFAULT_HISTOGRAM_SPACE_AGGREGATION
			: spaceAggregation
	) as T;
}

/** What a kind looks like when you leave it; restored verbatim if you return. */
interface KindState {
	pluginSpec: DashboardtypesPanelPluginDTO['spec'];
	queries: DashboardtypesQueryDTO[];
	builderQuery: Query;
}

interface UsePanelTypeSwitchArgs {
	spec: DashboardtypesPanelSpecDTO;
	panelType: PANEL_TYPES;
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
}

interface UsePanelTypeSwitchApi {
	/** Switch the panel to `newKind`, transforming/restoring its query + spec. */
	onChangePanelKind: (newKind: PanelKind) => void;
}

/**
 * Switches the edited panel's visualization kind. Mutating `plugin.kind` re-derives the
 * renderer, config sections, query-builder tabs and request type for free; this hook adds
 * the two things that don't: a per-kind session cache that makes switching reversible
 * (`Table → List → Table` restores the original query + spec), and, on first visit to a
 * kind, a query rebuild (`handleQueryChange`) + spec reset (`getSwitchedPluginSpec`).
 */
export function usePanelTypeSwitch({
	spec,
	panelType,
	setSpec,
}: UsePanelTypeSwitchArgs): UsePanelTypeSwitchApi {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const cacheRef = useRef<Map<PanelKind, KindState>>(new Map());

	// Latest spec/query/type, read inside the stable callback without re-subscribing.
	const specRef = useRef(spec);
	specRef.current = spec;
	const queryRef = useRef(currentQuery);
	queryRef.current = currentQuery;
	const panelTypeRef = useRef(panelType);
	panelTypeRef.current = panelType;

	const onChangePanelKind = useCallback(
		(newKind: PanelKind): void => {
			const currentSpec = specRef.current;
			const oldKind = currentSpec.plugin.kind as PanelKind;
			if (newKind === oldKind) {
				return;
			}
			void logEvent(DashboardDetailEvents.PanelTypeChanged, {
				from: oldKind,
				to: newKind,
			});
			const query = queryRef.current;

			cacheRef.current.set(oldKind, {
				pluginSpec: currentSpec.plugin.spec,
				queries: currentSpec.queries,
				builderQuery: query,
			});

			const newPanelType = PANEL_KIND_TO_PANEL_TYPE[newKind];

			// Only `plugin` needs a cast: it's a discriminated union over `kind`, and a
			// dynamically-chosen kind can't be correlated with its spec statically (as in
			// `createDefaultPanel`). The surrounding spec stays fully typed.
			const buildSpec = (
				pluginSpec: DashboardtypesPanelPluginDTO['spec'] | SwitchedPluginSpec,
				queries: DashboardtypesQueryDTO[],
			): DashboardtypesPanelSpecDTO => ({
				...currentSpec,
				plugin: {
					...currentSpec.plugin,
					kind: newKind,
					spec: pluginSpec,
				} as DashboardtypesPanelPluginDTO,
				queries,
			});

			// Revisit → restore the stash verbatim (the reversibility path). A static
			// kind's stash carries `queries: []` and its builder query is untouched —
			// there is no builder to re-seed for it.
			const cached = cacheRef.current.get(newKind);
			if (cached) {
				setSpec(buildSpec(cached.pluginSpec, cached.queries));
				if (!isQuerylessPanelKind(newKind)) {
					redirectWithQueryBuilderData(cached.builderQuery);
				}
				return;
			}

			// First visit to a static kind → fresh spec from its sections, queries
			// emptied (the API accepts nothing else), and the query builder left as-is:
			// the stash above keeps the old kind's query for the return trip.
			if (isQuerylessPanelKind(newKind)) {
				const signal = getBuilderQueries(currentSpec.queries)[0]
					?.signal as TelemetrytypesSignalDTO;
				setSpec(buildSpec(getSwitchedPluginSpec(currentSpec, newKind, signal), []));
				return;
			}

			// First visit → coerce the query type if the new kind disallows it, then
			// rebuild the builder query for the new type.
			const queryType = resolveQueryType(newKind, query.queryType);
			const transformed = handleQueryChange(
				newPanelType as keyof PartialPanelTypes,
				{ ...query, queryType },
				panelTypeRef.current,
			);
			// Match a fresh list panel's default order so the builder's Order By isn't empty.
			let nextQuery =
				newKind === 'signoz/ListPanel'
					? withDefaultListOrder(transformed)
					: transformed;
			nextQuery =
				newKind === 'signoz/HeatmapPanel'
					? withSingleHeatmapQuery(nextQuery)
					: withPercentileHistogramAggregation(nextQuery);
			const signal = getBuilderQueries(currentSpec.queries)[0]
				?.signal as TelemetrytypesSignalDTO;

			setSpec(
				buildSpec(
					getSwitchedPluginSpec(currentSpec, newKind, signal),
					toPerses(nextQuery, newPanelType),
				),
			);
			redirectWithQueryBuilderData(nextQuery);
		},
		[setSpec, redirectWithQueryBuilderData],
	);

	return { onChangePanelKind };
}
