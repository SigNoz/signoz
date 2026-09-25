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
	getSupportedSignals,
	isStaticPanelKind,
	resolveQueryMode,
} from 'pages/DashboardPage/DashboardContainer/Panels/capabilities';
import { QueryMode } from 'types/common/dashboard';
import {
	getBuilderMode,
	getQueryMode,
} from 'pages/DashboardPage/DashboardContainer/Panels/utils/queryMode';
import { seedBuilderForMode } from 'pages/DashboardPage/DashboardContainer/Panels/utils/seedBuilderForMode';
import { useQueryModeCacheStore } from 'pages/DashboardPage/DashboardContainer/store/useQueryModeCacheStore';
import { toPanelType, type PanelKind } from '../../Panels/types/panelKind';
import { getBuilderQueries } from '../../Panels/utils/getBuilderQueries';
import { toPerses } from '../../queryV5/persesQueryAdapters';
import {
	getSwitchedPluginSpec,
	type SwitchedPluginSpec,
} from '../getSwitchedPluginSpec';

function isBuilderMode(mode: QueryMode): boolean {
	return mode === QueryMode.QUERY_BUILDER || mode === QueryMode.AI_QUERY_BUILDER;
}

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
	const {
		currentQuery,
		redirectWithQueryBuilderData,
		updateAllQueriesOperators,
	} = useQueryBuilder();
	const parkQueryMode = useQueryModeCacheStore((store) => store.park);
	const parkedByKind = useQueryModeCacheStore((store) => store.byKind);

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
			// Per kind, not per mode: two kinds' Query Builder queries must not share one slot.
			const activeBuilderMode = getBuilderMode(query.builder);
			const hiddenBuilderMode =
				activeBuilderMode === QueryMode.AI_QUERY_BUILDER
					? QueryMode.QUERY_BUILDER
					: QueryMode.AI_QUERY_BUILDER;
			parkQueryMode(oldKind, activeBuilderMode, query.builder);
			const hiddenBuilder = parkedByKind[oldKind]?.[hiddenBuilderMode];

			const newPanelType = toPanelType(newKind);
			const targetMode = resolveQueryMode(newKind, getQueryMode(query));
			const targetBuilderMode = isBuilderMode(targetMode)
				? targetMode
				: activeBuilderMode;
			// An AI query is a builder query carrying the tag, so it rides on `builder`.
			const targetQueryType =
				targetMode === QueryMode.AI_QUERY_BUILDER
					? QueryMode.QUERY_BUILDER
					: targetMode;
			const builderForNewKind = (): Query['builder'] =>
				parkedByKind[newKind]?.[targetBuilderMode] ??
				(targetBuilderMode === activeBuilderMode
					? query.builder
					: seedBuilderForMode({
							mode: targetBuilderMode,
							defaultSignal: getSupportedSignals(newKind)[0],
							panelType: newPanelType,
							updateAllQueriesOperators,
						}));

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

			// Revisit → restore the stash (the reversibility path), in the mode the user is
			// authoring in. A static kind's stash carries `queries: []` and its builder query
			// is untouched — there is no builder to re-seed for it.
			const cached = cacheRef.current.get(newKind);
			if (cached) {
				setSpec(buildSpec(cached.pluginSpec, cached.queries));
				if (!isStaticPanelKind(newKind)) {
					redirectWithQueryBuilderData({
						...cached.builderQuery,
						queryType: targetQueryType,
						builder: builderForNewKind(),
					});
				}
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

			// First visit → rebuild the query for the new panel type, in the sticky mode.
			const transformed = handleQueryChange(
				newPanelType as keyof PartialPanelTypes,
				{
					...query,
					queryType: targetQueryType,
					builder: builderForNewKind(),
				},
				panelTypeRef.current,
			);
			// The hidden tab follows the visible one, rebuilt for the new panel type.
			if (hiddenBuilder) {
				parkQueryMode(
					newKind,
					hiddenBuilderMode,
					handleQueryChange(
						newPanelType as keyof PartialPanelTypes,
						{ ...query, builder: hiddenBuilder },
						panelTypeRef.current,
					).builder,
				);
			}
			// Match a fresh list panel's default order so the builder's Order By isn't empty.
			const nextQuery =
				newKind === 'signoz/ListPanel'
					? withDefaultListOrder(transformed)
					: transformed;
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
		[
			setSpec,
			redirectWithQueryBuilderData,
			parkQueryMode,
			parkedByKind,
			updateAllQueriesOperators,
		],
	);

	return { onChangePanelKind };
}
