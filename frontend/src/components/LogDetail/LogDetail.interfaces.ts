import type { MouseEventHandler } from 'react';
import type { ChangeViewFunctionType } from 'hooks/useHandleExplorerTabChange';
import type { IField } from 'types/api/logs/fields';
import type { ILog } from 'types/api/logs/log';

import type { VIEWS } from './constants';

export type LogDetailProps = {
	log: ILog | null;
	selectedTab?: VIEWS;
	handleChangeSelectedView?: ChangeViewFunctionType;
	isListViewPanel?: boolean;
	listViewPanelSelectedFields?: IField[] | null;
	logs?: ILog[];
	onNavigateLog?: (log: ILog) => void;
	onScrollToLog?: (logId: string) => void;
	handleOpenInExplorer?: MouseEventHandler;
	onApplyLogFilter?: (expression: string) => void;
	onClose: () => void;
};

export type LogDetailBodyProps = Pick<
	LogDetailProps,
	| 'selectedTab'
	| 'isListViewPanel'
	| 'handleChangeSelectedView'
	| 'onApplyLogFilter'
	| 'onClose'
> & {
	log: ILog;
	onPrev: () => void;
	onNext: () => void;
};
