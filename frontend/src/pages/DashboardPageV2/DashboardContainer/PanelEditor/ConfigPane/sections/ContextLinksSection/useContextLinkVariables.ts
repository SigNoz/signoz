import { useMemo } from 'react';
import { useGetDashboardV2 } from 'api/generated/services/dashboard';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { dtoToFormModel } from 'pages/DashboardPageV2/DashboardContainer/DashboardSettings/Variables/variableAdapters';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';

import type { VariableItem } from './types';

// Global time-range variables, always available (V1 parity: `timestamp_start` / `_end`).
const GLOBAL_TIMESTAMP_VARIABLES: VariableItem[] = [
	{ name: 'timestamp_start', source: 'Global timestamp' },
	{ name: 'timestamp_end', source: 'Global timestamp' },
];

/**
 * Variables offered by the context-link autocomplete, ordered as in V1: global
 * timestamps, then per-query `groupBy` fields (prefixed `_`), then dashboard variables.
 *
 * Self-contained — the editor renders inside the query-builder provider and the
 * DashboardContainer, so every source is read here rather than threaded through the
 * section registry. The dashboard fetch dedupes against the editor page's own query.
 */
export function useContextLinkVariables(): VariableItem[] {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const { currentQuery } = useQueryBuilder();

	const { data } = useGetDashboardV2(
		{ id: dashboardId },
		{ query: { enabled: !!dashboardId } },
	);
	const variableDtos = data?.data?.spec?.variables;

	const dashboardVariableNames = useMemo(
		() =>
			(variableDtos ?? [])
				.map((dto) => dtoToFormModel(dto).name)
				.filter((name): name is string => !!name),
		[variableDtos],
	);

	// `_`-prefixed to match V1 and avoid colliding with dashboard-variable names.
	const fieldVariableNames = useMemo(() => {
		const names = new Set<string>();
		(currentQuery?.builder?.queryData ?? []).forEach((query) => {
			(query.groupBy ?? []).forEach((field) => {
				if (field.key) {
					names.add(`_${field.key}`);
				}
			});
		});
		return Array.from(names);
	}, [currentQuery?.builder?.queryData]);

	return useMemo(
		() => [
			...GLOBAL_TIMESTAMP_VARIABLES,
			...fieldVariableNames.map(
				(name): VariableItem => ({ name, source: 'Query variable' }),
			),
			...dashboardVariableNames.map(
				(name): VariableItem => ({ name, source: 'Dashboard variable' }),
			),
		],
		[fieldVariableNames, dashboardVariableNames],
	);
}
