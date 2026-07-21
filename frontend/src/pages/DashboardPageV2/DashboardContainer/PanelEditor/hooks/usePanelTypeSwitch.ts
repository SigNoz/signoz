import { useCallback, useRef } from 'react';
import logEvent from 'api/common/logEvent';
import type {
	DashboardtypesPanelPluginDTO,
	DashboardtypesPanelSpecDTO,
	DashboardtypesQueryDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	handleQueryChange,
	type PartialPanelTypes,
} from 'container/NewWidget/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import type {
	OrderByPayload,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';

import { resolveQueryType } from '../../Panels/capabilities';
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

			// Revisit → restore the stash verbatim (the reversibility path).
			const cached = cacheRef.current.get(newKind);
			if (cached) {
				setSpec(buildSpec(cached.pluginSpec, cached.queries));
				redirectWithQueryBuilderData(cached.builderQuery);
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
			const nextQuery =
				newPanelType === PANEL_TYPES.LIST
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
		[setSpec, redirectWithQueryBuilderData],
	);

	return { onChangePanelKind };
}
