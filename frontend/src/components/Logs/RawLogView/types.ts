import { FontSize } from 'container/OptionsMenu/types';
import { MouseEvent } from 'react';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

export interface RawLogViewProps {
	isActiveLog?: boolean;
	isReadOnly?: boolean;
	isTextOverflowEllipsisDisabled?: boolean;
	isHighlighted?: boolean;
	helpTooltip?: string;
	data: ILog;
	linesPerRow: number;
	fontSize: FontSize;
	selectedFields?: IField[];
	onLogClick?: (log: ILog, event: MouseEvent) => void;
}

export interface RawLogContentProps {
	linesPerRow: number;
	fontSize: FontSize;
	$isReadOnly?: boolean;
	$isActiveLog?: boolean;
	$isDarkMode?: boolean;
	$isTextOverflowEllipsisDisabled?: boolean;
}
