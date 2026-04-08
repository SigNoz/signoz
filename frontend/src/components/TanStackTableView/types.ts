import { ColumnSizingState } from '@tanstack/react-table';
import { ILog } from 'types/api/logs/log';

import { ChangeViewFunctionType } from '../../container/ExplorerOptions/types';
import { VIEW_TYPES } from '../LogDetail/constants';
import { ColumnTypeRender, UseTableViewProps } from '../Logs/TableView/types';

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

export type TanStackTableProps = {
	isLoading?: boolean;
	isFetching?: boolean;
	onRemoveColumn?: (columnKey: string) => void;
	tableViewProps: Omit<UseTableViewProps, 'onOpenLogsContext' | 'onClickExpand'>;
	infitiyTableProps?: {
		onEndReached: (index: number) => void;
	};
	handleChangeSelectedView?: ChangeViewFunctionType;
	logs?: ILog[];
	onSetActiveLog?: (
		log: ILog,
		selectedTab?: typeof VIEW_TYPES[keyof typeof VIEW_TYPES],
	) => void;
	onClearActiveLog?: () => void;
	activeLog?: ILog | null;
};
