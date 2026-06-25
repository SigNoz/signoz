import type { ReactElement } from 'react';
import { useMemo } from 'react';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import {
	getBodyDisplayString,
	getSanitizedLogBody,
} from 'container/LogDetailedView/utils';
import { FontSize } from 'container/OptionsMenu/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { FlatLogData } from 'lib/logs/flatLogData';
import { useTimezone } from 'providers/Timezone';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

import type { TableColumnDef } from '../../TanStackTableView/types';
import LogStateIndicator from '../LogStateIndicator/LogStateIndicator';

type UseLogsTableColumnsProps = {
	fields: IField[];
	fontSize: FontSize;
};

export function useLogsTableColumns({
	fields,
	fontSize,
}: UseLogsTableColumnsProps): TableColumnDef<ILog>[] {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return useMemo<TableColumnDef<ILog>[]>(() => {
		const stateIndicatorCol: TableColumnDef<ILog> = {
			id: 'state-indicator',
			header: '',
			pin: 'left',
			enableMove: false,
			enableResize: false,
			enableRemove: false,
			canBeHidden: false,
			width: { fixed: 24 },
			cell: ({ row }): ReactElement => (
				<LogStateIndicator
					fontSize={fontSize}
					severityText={row.severity_text as string}
					severityNumber={row.severity_number as number}
				/>
			),
		};

		const timestampCol: TableColumnDef<ILog> = {
			id: buildCompositeKey('timestamp', 'log'),
			header: 'Timestamp',
			accessorFn: (log): unknown => log.timestamp,
			canBeHidden: false,
			enableRemove: false,
			width: { default: 170, min: 170 },
			cell: ({ value }): ReactElement => {
				const ts = value as string | number;
				const formatted =
					typeof ts === 'string'
						? formatTimezoneAdjustedTimestamp(ts, DATE_TIME_FORMATS.ISO_DATETIME_MS)
						: formatTimezoneAdjustedTimestamp(
								ts / 1e6,
								DATE_TIME_FORMATS.ISO_DATETIME_MS,
							);
				return <TanStackTable.Text>{formatted}</TanStackTable.Text>;
			},
		};

		const bodyCol: TableColumnDef<ILog> = {
			id: buildCompositeKey('body', 'log'),
			header: 'Body',
			accessorFn: (log): string => getBodyDisplayString(log.body),
			canBeHidden: false,
			enableRemove: false,
			width: { default: '100%', min: 300 },
			cell: ({ value, isActive }): ReactElement => (
				<TanStackTable.Text
					dangerouslySetInnerHTML={{
						__html: getSanitizedLogBody(value as string, {
							shouldEscapeHtml: true,
						}),
					}}
					data-active={isActive}
				/>
			),
		};

		const makeUserFieldCol = (f: IField): TableColumnDef<ILog> => ({
			id: buildCompositeKey(f.name, f.type),
			header: f.name,
			accessorFn: (log): unknown => FlatLogData(log)[f.name],
			enableRemove: true,
			width: { min: 192 },
			cell: ({ value }): ReactElement => (
				<TanStackTable.Text>{String(value ?? '')}</TanStackTable.Text>
			),
		});

		// Match body/timestamp by composite key, not bare name — else a variant
		// like `attribute.body` collapses onto `log.body`, duplicating the column.
		const fieldCols = fields
			.map((f): TableColumnDef<ILog> | null => {
				if (f.name === 'id') {
					return null;
				}
				const compositeKey = buildCompositeKey(f.name, f.type);
				if (compositeKey === timestampCol.id) {
					return timestampCol;
				}
				if (compositeKey === bodyCol.id) {
					return bodyCol;
				}
				return makeUserFieldCol(f);
			})
			.filter((c): c is TableColumnDef<ILog> => c !== null);

		return [stateIndicatorCol, ...fieldCols];
	}, [fields, fontSize, formatTimezoneAdjustedTimestamp]);
}
