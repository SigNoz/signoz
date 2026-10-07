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

import {
	getQueryPanelDefinition,
	isStaticPanelKind,
	resolveQueryMode,
} from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import { getQueryModeSignals } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelCapabilities';
import { QueryMode } from 'types/common/dashboard';
import {
	type BuilderStash,
	getBuilderMode,
	getQueryMode,
	isBuilderMode,
	withoutAIQueryTag,
} from 'pages/DashboardPage/DashboardContainer/Panels/utils/queryMode';
import { seedBuilderForMode } from 'pages/DashboardPage/DashboardContainer/Panels/utils/seedBuilderForMode';
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
	/** Both builder tabs' queries as the kind was left, keyed by mode. */
	builders: BuilderStash;
}

interface UsePanelKindAndQueryModeSwitchArgs {
	spec: DashboardtypesPanelSpecDTO;
	panelType: PANEL_TYPES;
	setSpec: (next: DashboardtypesPanelSpecDTO) => void;
}

interface UsePanelKindAndQueryModeSwitchApi {
	/** Switch the panel to `newKind`, transforming/restoring its query + spec. */
	onChangePanelKind: (newKind: PanelKind) => void;
	/** Switch authoring tab; shares the off-screen builder stash with the kind switch. */
	onChangeQueryMode: (key: string) => void;
}

/**
 * Switches the edited panel's visualization kind. Mutating `plugin.kind` re-derives the
 * renderer, config sections, query-builder tabs and request type for free; this hook adds
 * the two things that don't: a per-kind session cache that makes switching reversible
 * (`Table → List → Table` restores the original query + spec), and, on first visit to a
 * kind, a query rebuild (`handleQueryChange`) + spec reset (`getSwitchedPluginSpec`).
 * It also owns the tab switch, stashing the off-screen builder tab per mode and per kind.
 */
export function usePanelKindAndQueryModeSwitch({
	spec,
	panelType,
	setSpec,
}: UsePanelKindAndQueryModeSwitchArgs): UsePanelKindAndQueryModeSwitchApi {
	const {
		currentQuery,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
	} = useQueryBuilder();

	const cacheRef = useRef<Map<PanelKind, KindState>>(new Map());
	// Builder queries for the tabs not on screen; the live one is `currentQuery.builder`.
	const parkedBuilders = useRef<BuilderStash>({});

	// Latest spec/query/type, read inside the stable callback without re-subscribing.
	const specRef = useRef(spec);
	specRef.current = spec;
	const queryRef = useRef(currentQuery);
	queryRef.current = currentQuery;
	const panelTypeRef = useRef(panelType);
	panelTypeRef.current = panelType;

	const onChangeQueryMode = useQueryModeChange({
		panelType,
		supportedQueryModes:
			getQueryPanelDefinition(spec.plugin.kind as PanelKind)
				?.supportedQueryModes ?? {},
		parkedBuilders,
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
				builders: {
					...parkedBuilders.current,
					[getBuilderMode(query.builder)]: query.builder,
				},
			});

			const newPanelType = toPanelType(newKind);
			const targetMode = resolveQueryMode(newKind, getQueryMode(query));
			// An AI query is a builder query carrying the tag, so it rides on `builder`.
			const targetQueryType =
				targetMode === QueryMode.AI_QUERY_BUILDER
					? QueryMode.QUERY_BUILDER
					: targetMode;

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
			const rebuildForNewKind = (source: Query): Query => {
				const transformed = handleQueryChange(
					newPanelType as keyof PartialPanelTypes,
					{ ...source, queryType: targetQueryType },
					panelTypeRef.current,
				);
				// Match a fresh list panel's default order so the builder's Order By isn't empty.
				const ordered =
					newKind === 'signoz/ListPanel'
						? withDefaultListOrder(transformed)
						: transformed;
				return newKind === 'signoz/HeatmapPanel'
					? withSingleHeatmapQuery(ordered)
					: withPercentileHistogramAggregation(ordered);
			};
			// Tab unused on this kind: AI gets a fresh seed, Query Builder reuses `source` untagged.
			const seedTargetTab = (source: Query): Query =>
				targetMode === QueryMode.AI_QUERY_BUILDER
					? {
							...source,
							builder: seedBuilderForMode({
								mode: targetMode,
								defaultSignal: getQueryModeSignals(
									getQueryPanelDefinition(newKind)?.supportedQueryModes,
									QueryMode.QUERY_BUILDER,
								)[0],
								panelType: newPanelType,
								updateAllQueriesOperators,
							}),
						}
					: withoutAIQueryTag(source);
			// Target tab's query comes from the stash; the rest stay parked.
			const unparkTargetTab = (
				source: Query,
				stash: BuilderStash,
			): { query: Query; parked: BuilderStash } => {
				const stored = isBuilderMode(targetMode)
					? stash[targetMode]
					: source.builder;
				const next = stored
					? { ...source, builder: stored }
					: seedTargetTab(source);
				const parked: BuilderStash = { ...stash };
				delete parked[getBuilderMode(next.builder)];
				return { query: next, parked };
			};

			// Revisit → restore the stash in the active mode; a static kind has no builder to re-seed.
			const cached = cacheRef.current.get(newKind);
			if (cached) {
				if (isStaticPanelKind(newKind)) {
					setSpec(buildSpec(cached.pluginSpec, cached.queries));
					return;
				}
				const restored = unparkTargetTab(cached.query, cached.builders);
				parkedBuilders.current = restored.parked;
				// The stashed preview queries belong to the stashed query, not a swapped-in one.
				setSpec(
					buildSpec(
						cached.pluginSpec,
						restored.query.builder === cached.query.builder
							? cached.queries
							: toPerses(restored.query, newPanelType),
					),
				);
				redirectWithQueryBuilderData({
					...restored.query,
					queryType: targetQueryType,
				});
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

			// First visit → rebuild both builder tabs' queries for the new panel type.
			const transformed = rebuildForNewKind(query);
			const rebuiltStash: BuilderStash = {};
			(Object.keys(parkedBuilders.current) as QueryMode[]).forEach((mode) => {
				const parked = parkedBuilders.current[mode];
				if (parked) {
					rebuiltStash[mode] = rebuildForNewKind({
						...query,
						builder: parked,
					}).builder;
				}
			});
			rebuiltStash[getBuilderMode(transformed.builder)] = transformed.builder;
			const picked = unparkTargetTab(transformed, rebuiltStash);
			parkedBuilders.current = picked.parked;
			const nextQuery = picked.query;
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
		[setSpec, redirectWithQueryBuilderData, updateAllQueriesOperators],
	);

	return { onChangePanelKind, onChangeQueryMode };
}
