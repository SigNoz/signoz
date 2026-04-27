import type { ReactElement } from 'react';
import { useMemo } from 'react';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getSanitizedLogBody } from 'container/LogDetailedView/utils';
import { FontSize } from 'container/OptionsMenu/types';
import { FlatLogData } from 'lib/logs/flatLogData';
import { useTimezone } from 'providers/Timezone';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

import type { TableColumnDef } from '../../TanStackTableView/types';
import LogStateIndicator from '../LogStateIndicator/LogStateIndicator';

type UseLogsTableColumnsProps = {
	fields: IField[];
	fontSize: FontSize;
	appendTo?: 'center' | 'end';
};

export function useLogsTableColumns({
	fields,
	fontSize,
	appendTo = 'center',
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

		const fieldColumns: TableColumnDef<ILog>[] = fields
			.filter((f): boolean => !['id', 'body', 'timestamp'].includes(f.name))
			.map(
				(f): TableColumnDef<ILog> => ({
					id: f.name,
					header: f.name,
					accessorFn: (log): unknown => FlatLogData(log)[f.name],
					enableRemove: true,
					width: { min: 192 },
					cell: ({ value }): ReactElement => (
						<TanStackTable.Text>{String(value ?? '')}</TanStackTable.Text>
					),
				}),
			);

		const timestampCol: TableColumnDef<ILog> | null = fields.some(
			(f) => f.name === 'timestamp',
		)
			? {
					id: 'timestamp',
					header: 'Timestamp',
					accessorFn: (log): unknown => log.timestamp,
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
				}
			: null;

		const bodyCol: TableColumnDef<ILog> | null = fields.some(
			(f) => f.name === 'body',
		)
			? {
					id: 'body',
					header: 'Body',
					accessorFn: (log): string => log.body,
					canBeHidden: false,
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
				}
			: null;

		return [
			stateIndicatorCol,
			...(timestampCol ? [timestampCol] : []),
			...(appendTo === 'center' ? fieldColumns : []),
			...(bodyCol ? [bodyCol] : []),
			...(appendTo === 'end' ? fieldColumns : []),
		];
	}, [fields, appendTo, fontSize, formatTimezoneAdjustedTimestamp]);
}
