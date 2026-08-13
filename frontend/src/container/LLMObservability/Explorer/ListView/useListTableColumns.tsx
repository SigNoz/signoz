import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { TelemetryFieldKey } from 'api/v5/v5';
import TanStackTable from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { useTimezone } from 'providers/Timezone';

import { formatCellValue, TraceListRow } from '../tableUtils';

/** Older callers passed `{ key, type }` where v5 uses `{ name, fieldContext }`. */
interface LegacyFieldKey {
	key?: string;
	type?: string;
}

const BADGE_FIELDS = new Set([
	'httpMethod',
	'responseStatusCode',
	'response_status_code',
	'http_method',
]);

const DURATION_FIELDS = new Set(['durationNano', 'duration_nano']);

const TIMESTAMP_COLUMN_ID = 'date';

/** Cells must tolerate missing values: skeleton rows pass through them. */
export function useListTableColumns(
	selectedColumns: TelemetryFieldKey[],
): TableColumnDef<TraceListRow>[] {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return useMemo<TableColumnDef<TraceListRow>[]>(() => {
		const timestampColumn: TableColumnDef<TraceListRow> = {
			id: TIMESTAMP_COLUMN_ID,
			header: 'Timestamp',
			accessorFn: (row): unknown => row?.date,
			canBeHidden: false,
			enableRemove: false,
			width: { default: 180, min: 180 },
			cell: ({ value }): ReactElement => {
				const timestamp = value as string | number | undefined;
				if (timestamp === undefined || timestamp === null) {
					return <TanStackTable.Text> </TanStackTable.Text>;
				}
				const formatted =
					typeof timestamp === 'string'
						? formatTimezoneAdjustedTimestamp(
								timestamp,
								DATE_TIME_FORMATS.ISO_DATETIME_MS,
							)
						: formatTimezoneAdjustedTimestamp(
								timestamp / 1e6,
								DATE_TIME_FORMATS.ISO_DATETIME_MS,
							);
				return <TanStackTable.Text>{String(formatted)}</TanStackTable.Text>;
			},
		};

		const fieldColumns = selectedColumns.map(
			(field): TableColumnDef<TraceListRow> => {
				const legacy = field as TelemetryFieldKey & LegacyFieldKey;
				const name = field?.name || legacy?.key || '';
				const fieldContext = field?.fieldContext || legacy?.type;

				return {
					id: buildCompositeKey(name, fieldContext),
					header: name,
					accessorFn: (row): unknown => row?.[name],
					enableRemove: true,
					width: { min: 192 },
					cell: ({ value }): ReactElement => {
						if (value === undefined || value === null || value === '') {
							return <TanStackTable.Text data-testid={name}>N/A</TanStackTable.Text>;
						}

						if (BADGE_FIELDS.has(name)) {
							return (
								<Badge data-testid={name} color="sakura" variant="outline">
									{formatCellValue(value)}
								</Badge>
							);
						}

						if (DURATION_FIELDS.has(name)) {
							return (
								<TanStackTable.Text data-testid={name}>
									{getMs(formatCellValue(value))}ms
								</TanStackTable.Text>
							);
						}

						return (
							<span data-testid={name}>
								<LineClampedText text={formatCellValue(value)} lines={3} />
							</span>
						);
					},
				};
			},
		);

		return [timestampColumn, ...fieldColumns];
	}, [selectedColumns, formatTimezoneAdjustedTimestamp]);
}
