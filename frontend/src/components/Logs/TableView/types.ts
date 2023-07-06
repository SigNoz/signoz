import { ColumnType } from 'antd/es/table';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

export type ColumnTypeRender<T = unknown> = ReturnType<
	NonNullable<ColumnType<T>['render']>
>;

export type LogsTableViewProps = {
	logs: ILog[];
	fields: IField[];
	linesPerRow: number;
	onClickExpand: (log: ILog) => void;
};
