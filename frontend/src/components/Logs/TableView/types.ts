import { ColumnsType, ColumnType } from 'antd/es/table';
import { FontSize } from 'container/OptionsMenu/types';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

export type ColumnTypeRender<T = unknown> = ReturnType<
	NonNullable<ColumnType<T>['render']>
>;

export type LogsTableViewProps = {
	logs: ILog[];
	fields: IField[];
	linesPerRow: number;
	fontSize: FontSize;
	onClickExpand?: (log: ILog) => void;
};

export type UseTableViewResult = {
	columns: ColumnsType<Record<string, unknown>>;
	dataSource: Record<string, string>[];
};

export type UseTableViewProps = {
	appendTo?: 'center' | 'end';
	onOpenLogsContext?: (log: ILog) => void;
	onClickExpand?: (log: ILog) => void;
	activeLog?: ILog | null;
	activeLogIndex?: number;
	activeContextLog?: ILog | null;
	isListViewPanel?: boolean;
} & LogsTableViewProps;

export type ActionsColumnProps = {
	logId: string;
	logs: ILog[];
	onOpenLogsContext?: (log: ILog) => void;
};
