import { SavedviewtypesSavedViewSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'api/v5/v5';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
	ensureLogsRequiredColumns,
} from 'container/OptionsMenu/constants';
import { FontSize, LogViewMode } from 'container/OptionsMenu/types';
import { Preferences } from 'providers/preferences/types';
import { DataSource } from 'types/common/queryBuilder';

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
	dataSource: DataSource,
): Preferences {
	const selectedFields = spec?.selectedFields as TelemetryFieldKey[] | undefined;

	if (dataSource === DataSource.LOGS) {
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
	if (dataSource === DataSource.TRACES) {
		return { columns: selectedFields || defaultTraceSelectedColumns };
	}
	return { columns: [] };
}
