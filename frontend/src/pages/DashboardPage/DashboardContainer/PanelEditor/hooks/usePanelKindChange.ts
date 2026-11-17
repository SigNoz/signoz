import { useCallback, useRef } from 'react';
import logEvent from 'api/common/logEvent';
import type {
	DashboardtypesPanelPluginDTO,
	DashboardtypesPanelSpecDTO,
	DashboardtypesQueryDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.types';
import { resolveQueryBuilderField } from 'components/QueryBuilderV2/queryBuilderFields.utils';
import { rebuildBuilderForPanelType } from 'lib/query/panelQuery';
import type { PartialPanelTypes } from 'lib/query/panelTypeDataSourceFormValuesMap';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import type {
	OrderByPayload,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';

import {
	getQueryPanelDefinition,
	isStaticPanelKind,
	resolveQueryType,
} from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import { toPanelType, type PanelKind } from '../../Panels/types/panelKind';
import { getBuilderQueries } from '../../Panels/utils/getBuilderQueries';
import { toPerses } from '../../queryV5/persesQueryAdapters';
import {
	getSwitchedPluginSpec,
	type SwitchedPluginSpec,
} from '../getSwitchedPluginSpec';
import {
	withPercentileHistogramAggregation,
	withSingleHeatmapQuery,
} from '../utils/heatmapQuery';

// V1's panel-type rebuild clears orderBy for lists; re-seed the fresh-list default (timestamp desc).
const DEFAULT_LIST_ORDER_BY: OrderByPayload[] = [
	{ columnName: 'timestamp', order: 'desc' },
];

function withDefaultListOrder(builder: Query['builder']): Query['builder'] {
	return {
		...builder,
		queryData: builder.queryData.map((qd) =>
			qd.orderBy && qd.orderBy.length > 0
				? qd
				: { ...qd, orderBy: DEFAULT_LIST_ORDER_BY },
		),
	};
}

/**
 * Fields the new kind hides could not be seen or cleared, yet would still apply: a limit
 * would cut rows, and a trace operator would be saved and rejected by the backend.
 */
function withoutHiddenFields(
	builder: Query['builder'],
	kind: PanelKind,
): Query['builder'] {
	const fields = getQueryPanelDefinition(kind)?.queryBuilderFields;
	const limitHidden = resolveQueryBuilderField(
		QueryBuilderField.Limit,
		fields,
	).hidden;
	const traceOperatorHidden = resolveQueryBuilderField(
		QueryBuilderField.TraceOperator,
		fields,
	).hidden;
	if (!limitHidden && !traceOperatorHidden) {
		return builder;
	}
	return {
		...builder,
		queryData: limitHidden
			? builder.queryData.map((qd) => ({ ...qd, limit: null }))
			: builder.queryData,
		queryFormulas: limitHidden
			? builder.queryFormulas.map((formula) => ({ ...formula, limit: null }))
			: builder.queryFormulas,
		queryTraceOperator: traceOperatorHidden ? [] : builder.queryTraceOperator,
	};
}

/** What a kind looks like when you leave it; restored verbatim if you return. */
interface KindState {
	pluginSpec: DashboardtypesPanelPluginDTO['spec'];
	queries: DashboardtypesQueryDTO[];
	query: Query;
}

interface UsePanelKindChangeArgs {
	spec: DashboardtypesPanelSpecDTO;
	panelType: PANEL_TYPES;
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
}

interface UsePanelKindChangeApi {
	/** Switch the panel to `newKind`, transforming/restoring its query + spec. */
	onChangePanelKind: (newKind: PanelKind) => void;
}

/**
 * Switches the edited panel's visualization kind. Mutating `plugin.kind` re-derives the
 * renderer, config sections, query-builder tabs and request type for free; this hook adds
 * the two things that don't: a per-kind session cache that makes switching reversible
 * (`Table → List → Table` restores the original query + spec), and, on first visit to a
 * kind, a query rebuild (`rebuildBuilderForPanelType`) + spec reset (`getSwitchedPluginSpec`).
 */
export function usePanelKindChange({
	spec,
	panelType,
	setSpec,
}: UsePanelKindChangeArgs): UsePanelKindChangeApi {
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
				query,
			});

			const newPanelType = toPanelType(newKind);

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

			const queryType = resolveQueryType(newKind, query.queryType);
			const rebuildForNewKind = (builder: Query['builder']): Query['builder'] => {
				// Builder-only, so either slot goes through it and the query type can't leak in.
				const transformed = rebuildBuilderForPanelType(
					newPanelType as keyof PartialPanelTypes,
					builder,
					panelTypeRef.current,
				);
				// Match a fresh list panel's default order so the builder's Order By isn't empty.
				const ordered = withoutHiddenFields(
					newKind === 'signoz/ListPanel'
						? withDefaultListOrder(transformed)
						: transformed,
					newKind,
				);
				return newKind === 'signoz/HeatmapPanel'
					? withSingleHeatmapQuery(ordered)
					: withPercentileHistogramAggregation(ordered);
			};

			// Revisit → restore the stash (the reversibility path) on the tab in use, an AI
			// query the kind never had riding along. A static kind's stash carries
			// `queries: []` and its builder query is untouched — there is no builder to
			// re-seed for it.
			const cached = cacheRef.current.get(newKind);
			if (cached) {
				if (isStaticPanelKind(newKind)) {
					setSpec(buildSpec(cached.pluginSpec, cached.queries));
					return;
				}
				const restored: Query = {
					...cached.query,
					queryType,
					...(!cached.query.builder_ai_query &&
						query.builder_ai_query && {
							builder_ai_query: rebuildForNewKind(query.builder_ai_query),
						}),
				};
				// The stashed preview queries belong to the stashed query's type.
				setSpec(
					buildSpec(
						cached.pluginSpec,
						queryType === cached.query.queryType
							? cached.queries
							: toPerses(restored, newPanelType),
					),
				);
				redirectWithQueryBuilderData(restored);
				return;
			}

			// First visit to a static kind → fresh spec from its sections, queries
			// emptied (the API accepts nothing else), and the query builder left as-is:
			// the stash above keeps the old kind's query for the return trip.
			if (isStaticPanelKind(newKind)) {
				const signal = getBuilderQueries(currentSpec.queries)[0]
					?.signal as TelemetrytypesSignalDTO;
				setSpec(buildSpec(getSwitchedPluginSpec(currentSpec, newKind, signal), []));
				return;
			}

			// First visit → rebuild every builder slot for the new kind.
			const nextQuery: Query = {
				...query,
				queryType,
				builder: rebuildForNewKind(query.builder),
				...(query.builder_ai_query && {
					builder_ai_query: rebuildForNewKind(query.builder_ai_query),
				}),
			};
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
