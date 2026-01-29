import { MouseEvent } from 'react';
import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import { FontSize } from 'container/OptionsMenu/types';
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
	handleChangeSelectedView?: ChangeViewFunctionType;
}

export interface RawLogContentProps {
	linesPerRow: number;
	fontSize: FontSize;
	$isReadOnly?: boolean;
	$isActiveLog?: boolean;
	$isDarkMode?: boolean;
	$isTextOverflowEllipsisDisabled?: boolean;
}
