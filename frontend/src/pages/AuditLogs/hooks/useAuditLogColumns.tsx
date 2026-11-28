import { ReactElement, useMemo } from 'react';
import { TableColumnDef } from 'components/TanStackTableView';
import { useAuditLogsOptionsStore } from './useAuditLogsOptionsStore';
import { FontSize } from 'container/OptionsMenu/types';

import { AuditLog, AuditLogsColumnIds } from '../AuditLogs.types';
import {
	getBody,
	getEventName,
	getOutcome,
	getPrincipalEmail,
	getResourceId,
	getResourceName,
	isServiceAccount,
	truncateId,
} from '../AuditLogs.utils';
import { EmailCell } from '../components/QueryResultCells/EmailCell';
import { MonospaceCell } from '../components/QueryResultCells/MonospaceCell';
import { OutcomeCell } from '../components/QueryResultCells/OutcomeCell';
import { OutcomeIndicator } from '../components/QueryResultCells/OutcomeIndicator';
import { TextCell } from '../components/QueryResultCells/TextCell';
import { TimeCell } from '../components/QueryResultCells/TimeCell';

interface UseAuditLogColumnsResult {
	columns: TableColumnDef<AuditLog>[];
	fontSize: FontSize;
}

export const useAuditLogColumns = (): UseAuditLogColumnsResult => {
	const fontSize = useAuditLogsOptionsStore((state) => state.fontSize);

	const columns = useMemo(() => {
		const outcomeIndicator: TableColumnDef<AuditLog> = {
			id: AuditLogsColumnIds.OUTCOME_INDICATOR,
			header: '',
			pin: 'left',
			enableMove: false,
			enableResize: false,
			enableRemove: false,
			canBeHidden: false,
			width: { fixed: 32 },
			cell: ({ row }): ReactElement => (
				<OutcomeIndicator outcome={getOutcome(row)} fontSize={fontSize} />
			),
		};

		const time: TableColumnDef<AuditLog> = {
			id: AuditLogsColumnIds.TIME,
			header: 'Time',
			enableMove: false,
			enableResize: false,
			enableRemove: false,
			canBeHidden: false,
			width: { default: 90, max: 100, min: 80 },
			accessorFn: (log): string => log.date,
			cell: ({ row }): ReactElement => <TimeCell date={row.date} />,
		};

		const fields: TableColumnDef<AuditLog>[] = [
			{
				id: AuditLogsColumnIds.PRINCIPAL_EMAIL,
				header: 'Principal email',
				enableMove: false,
				enableResize: false,
				enableRemove: false,
				canBeHidden: false,
				width: { default: 260, max: 320, min: 220 },
				accessorFn: getPrincipalEmail,
				cell: ({ row }): ReactElement => (
					<EmailCell email={getPrincipalEmail(row)} isBot={isServiceAccount(row)} />
				),
			},
			{
				id: AuditLogsColumnIds.EVENT_NAME,
				header: 'Event name',
				enableMove: false,
				enableResize: false,
				enableRemove: false,
				canBeHidden: false,
				width: { default: 200, max: 240, min: 180 },
				accessorFn: getEventName,
				cell: ({ row }): ReactElement => (
					<MonospaceCell value={getEventName(row)} />
				),
			},
			{
				id: AuditLogsColumnIds.RESOURCE_NAME,
				header: 'Resource name',
				enableMove: false,
				enableResize: false,
				enableRemove: false,
				canBeHidden: false,
				width: { default: 170, max: 220, min: 140 },
				accessorFn: getResourceName,
				cell: ({ row }): ReactElement => (
					<MonospaceCell value={getResourceName(row)} />
				),
			},
			{
				id: AuditLogsColumnIds.RESOURCE_ID,
				header: 'Resource ID',
				enableMove: false,
				enableResize: false,
				enableRemove: false,
				canBeHidden: false,
				width: { default: 140, max: 160, min: 120 },
				accessorFn: getResourceId,
				cell: ({ row }): ReactElement => (
					<TextCell
						value={getResourceId(row)}
						displayValue={truncateId(getResourceId(row))}
						monospace
					/>
				),
			},
			{
				id: AuditLogsColumnIds.OUTCOME,
				header: 'Outcome',
				enableMove: false,
				enableResize: false,
				enableRemove: false,
				canBeHidden: false,
				width: { fixed: 120 },
				accessorFn: getOutcome,
				cell: ({ row }): ReactElement => <OutcomeCell outcome={getOutcome(row)} />,
			},
			{
				id: AuditLogsColumnIds.BODY,
				header: 'Body',
				enableMove: false,
				enableResize: false,
				enableRemove: false,
				canBeHidden: false,
				width: { default: 1000, min: 300, max: 1000, ignoreLastColumnFill: true },
				accessorFn: getBody,
				cell: ({ row }): ReactElement => <TextCell value={getBody(row)} />,
			},
		];

		return [outcomeIndicator, time, ...fields];
	}, [fontSize]);

	return { columns, fontSize };
};
