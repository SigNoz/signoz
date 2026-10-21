import { useCallback, useRef } from 'react';
import logEvent from 'api/common/logEvent';
import type {
	DashboardtypesPanelPluginDTO,
	DashboardtypesPanelSpecDTO,
	DashboardtypesQueryDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { handleQueryChange } from 'lib/query/panelQuery';
import type { PartialPanelTypes } from 'lib/query/panelTypeDataSourceFormValuesMap';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import type {
	OrderByPayload,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

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
import { useQueryModeChange } from './useQueryModeChange';

// V1's handleQueryChange clears orderBy for lists; re-seed the fresh-list default (timestamp desc).
const DEFAULT_LIST_ORDER_BY: OrderByPayload[] = [
	{ columnName: 'timestamp', order: 'desc' },
];

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

/** What a kind looks like when you leave it; restored verbatim if you return. */
interface KindState {
	pluginSpec: DashboardtypesPanelPluginDTO['spec'];
	queries: DashboardtypesQueryDTO[];
	query: Query;
}

interface UsePanelKindAndQueryModeSwitchArgs {
	spec: DashboardtypesPanelSpecDTO;
	panelType: PANEL_TYPES;
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
}

interface UsePanelKindAndQueryModeSwitchApi {
	/** Switch the panel to `newKind`, transforming/restoring its query + spec. */
	onChangePanelKind: (newKind: PanelKind) => void;
	/** Switch authoring tab. */
	onChangeQueryMode: (key: string) => void;
}

/**
 * Switches the edited panel's visualization kind. Mutating `plugin.kind` re-derives the
 * renderer, config sections, query-builder tabs and request type for free; this hook adds
 * the two things that don't: a per-kind session cache that makes switching reversible
 * (`Table → List → Table` restores the original query + spec), and, on first visit to a
 * kind, a query rebuild (`handleQueryChange`) + spec reset (`getSwitchedPluginSpec`).
 */
export function usePanelKindAndQueryModeSwitch({
	spec,
	panelType,
	setSpec,
}: UsePanelKindAndQueryModeSwitchArgs): UsePanelKindAndQueryModeSwitchApi {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const cacheRef = useRef<Map<PanelKind, KindState>>(new Map());

	// Latest spec/query/type, read inside the stable callback without re-subscribing.
	const specRef = useRef(spec);
	specRef.current = spec;
	const queryRef = useRef(currentQuery);
	queryRef.current = currentQuery;
	const panelTypeRef = useRef(panelType);
	panelTypeRef.current = panelType;

	const onChangeQueryMode = useQueryModeChange({
		panelType,
		supportedQueryTypesKindMap:
			getQueryPanelDefinition(spec.plugin.kind as PanelKind)
				?.supportedQueryTypesKindMap ?? {},
	});

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
				const transformed = handleQueryChange(
					newPanelType as keyof PartialPanelTypes,
					{ ...query, queryType: EQueryType.QUERY_BUILDER, builder },
					panelTypeRef.current,
				);
				// Match a fresh list panel's default order so the builder's Order By isn't empty.
				const ordered =
					newKind === 'signoz/ListPanel'
						? withDefaultListOrder(transformed)
						: transformed;
				return (
					newKind === 'signoz/HeatmapPanel'
						? withSingleHeatmapQuery(ordered)
						: withPercentileHistogramAggregation(ordered)
				).builder;
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

	return { onChangePanelKind, onChangeQueryMode };
}
