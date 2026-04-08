import { ColumnSizingState } from '@tanstack/react-table';
import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { ILog } from 'types/api/logs/log';

export type TableRecord = Record<string, unknown>;

export type LogsTableColumnDef = {
	key?: string | number;
	title?: string;
	render?: (
		value: unknown,
		record: TableRecord,
		index: number,
	) => ColumnTypeRender<Record<string, unknown>>;
};

export type OrderedColumn = LogsTableColumnDef & {
	key: string | number;
};

export type TanStackTableRowData = {
	log: TableRecord;
	currentLog: ILog;
	rowIndex: number;
};

export type PersistedColumnSizing = {
	sizing: ColumnSizingState;
};
