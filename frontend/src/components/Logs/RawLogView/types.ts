import type { MouseEvent } from 'react';
import type { VIEW_TYPES } from 'components/LogDetail/constants';
import type { ChangeViewFunctionType } from 'hooks/useHandleExplorerTabChange';
import type { FontSize } from 'container/OptionsMenu/types';
import type { IField } from 'types/api/logs/fields';
import type { ILog } from 'types/api/logs/log';

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
	onSetActiveLog?: (
		log: ILog,
		selectedTab?: (typeof VIEW_TYPES)[keyof typeof VIEW_TYPES],
	) => void;
	onClearActiveLog?: () => void;
}

export interface RawLogContentProps {
	linesPerRow: number;
	fontSize: FontSize;
	$isReadOnly?: boolean;
	$isActiveLog?: boolean;
	$isDarkMode?: boolean;
	$isTextOverflowEllipsisDisabled?: boolean;
}
