import { FontSize } from 'container/OptionsMenu/types';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

export interface RawLogViewProps {
	isActiveLog?: boolean;
	isReadOnly?: boolean;
	isTextOverflowEllipsisDisabled?: boolean;
	data: ILog;
	linesPerRow: number;
	fontSize: FontSize;
	selectedFields?: IField[];
}

export interface RawLogContentProps {
	linesPerRow: number;
	fontSize: FontSize;
	$isReadOnly?: boolean;
	$isActiveLog?: boolean;
	$isDarkMode?: boolean;
	$isTextOverflowEllipsisDisabled?: boolean;
}
