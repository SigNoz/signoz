import {
	SavedviewtypesSavedViewSpecDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
	ensureLogsRequiredColumns,
} from 'container/OptionsMenu/constants';
import { FontSize, LogViewMode } from 'container/OptionsMenu/types';
import aiObservabilityLoaderConfig from 'providers/preferences/configs/aiObservabilityLoaderConfig';
import { Preferences } from 'providers/preferences/types';

function withColumnNames(
	columns: TelemetryFieldKey[] | undefined,
): TelemetryFieldKey[] | null {
	if (!columns) {
		return null;
	}
	return columns.map((column) => ({
		...column,
		name: column.name ?? column.key,
	}));
}

// The columns and formatting the explorer shows for a saved view, with the
// defaults filled in where the view has none.
export function getViewColumnsAndFormatting(
	spec: SavedviewtypesSavedViewSpecDTO | undefined,
	sourcePage: SavedviewtypesSourceDTO,
): Preferences {
	const selectedFields = spec?.selectedFields as TelemetryFieldKey[] | undefined;

	if (sourcePage === SavedviewtypesSourceDTO.logs) {
		return {
			columns: ensureLogsRequiredColumns(
				withColumnNames(selectedFields) || defaultLogsSelectedColumns,
			),
			formatting: {
				maxLines: spec?.display?.maxLines || 1,
				format: (spec?.display?.format as LogViewMode) || 'table',
				fontSize: (spec?.display?.fontSize as FontSize) || FontSize.SMALL,
				version: 1,
			},
		};
	}
	if (sourcePage === SavedviewtypesSourceDTO.traces) {
		return { columns: selectedFields || defaultTraceSelectedColumns };
	}
	if (sourcePage === SavedviewtypesSourceDTO.ai_observability) {
		if (!spec) {
			return { columns: [] };
		}
		const panelType = spec.panelType as unknown as PANEL_TYPES;
		return {
			columns:
				selectedFields || aiObservabilityLoaderConfig.default(panelType).columns,
			panelType,
		};
	}
	return { columns: [] };
}
