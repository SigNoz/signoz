import {
	SavedviewtypesSavedViewSpecDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'api/v5/v5';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
	ensureLogsRequiredColumns,
} from 'container/OptionsMenu/constants';
import { FontSize, LogViewMode } from 'container/OptionsMenu/types';
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
	return { columns: [] };
}
