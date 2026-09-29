import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import {
	initialQueriesMap,
	initialQueryAIWithType,
	type PANEL_TYPES,
} from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryMode } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

interface SeedBuilderForModeArgs {
	mode: QueryMode;
	/** The kind's first Query Builder signal; what a fresh panel of this kind starts on. */
	defaultSignal?: TelemetrytypesSignalDTO;
	panelType: PANEL_TYPES;
	updateAllQueriesOperators: (
		query: Query,
		panelType: PANEL_TYPES,
		dataSource: DataSource,
	) => Query;
}

/** A fresh builder query for `mode`: AI is traces-only, everything else follows the kind. */
export function seedBuilderForMode({
	mode,
	defaultSignal,
	panelType,
	updateAllQueriesOperators,
}: SeedBuilderForModeArgs): Query['builder'] {
	if (mode === QueryMode.AI_QUERY_BUILDER) {
		return updateAllQueriesOperators(
			initialQueryAIWithType,
			panelType,
			DataSource.TRACES,
		).builder;
	}
	const dataSource = (defaultSignal ??
		TelemetrytypesSignalDTO.metrics) as unknown as DataSource;
	return updateAllQueriesOperators(
		initialQueriesMap[dataSource],
		panelType,
		dataSource,
	).builder;
}
