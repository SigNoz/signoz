import { ColumnsType, ColumnType } from 'antd/es/table';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

export type ColumnTypeRender<T = unknown> = ReturnType<
	NonNullable<ColumnType<T>['render']>
>;

export type LogsTableViewProps = {
	logs: ILog[];
	fields: IField[];
	linesPerRow: number;
};

export type UseTableViewResult = {
	columns: ColumnsType<Record<string, unknown>>;
	dataSource: Record<string, string>[];
};

export type UseTableViewProps = {
	appendTo?: 'center' | 'end';
	onOpenLogsContext?: (log: ILog) => void;
	onClickExpand?: (log: ILog) => void;
} & LogsTableViewProps;

export type ActionsColumnProps = {
	logId: string;
	logs: ILog[];
	onOpenLogsContext?: (log: ILog) => void;
};
