import { ILog } from 'types/api/logs/log';

export interface RawLogViewProps {
	isActiveLog?: boolean;
	isReadOnly?: boolean;
	isTextOverflowEllipsisDisabled?: boolean;
	data: ILog;
	linesPerRow: number;
}

export interface RawLogContentProps {
	linesPerRow: number;
	$isReadOnly?: boolean;
	$isActiveLog?: boolean;
	$isTextOverflowEllipsisDisabled?: boolean;
}
