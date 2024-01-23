import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

export interface RawLogViewProps {
	isActiveLog?: boolean;
	isReadOnly?: boolean;
	isTextOverflowEllipsisDisabled?: boolean;
	data: ILog;
	linesPerRow: number;
	selectedFields: IField[];
}

export interface RawLogContentProps {
	linesPerRow: number;
	$isReadOnly?: boolean;
	$isActiveLog?: boolean;
	$isDarkMode?: boolean;
	$isTextOverflowEllipsisDisabled?: boolean;
}
