import { MouseEventHandler } from 'react';
import { ChangeViewFunctionType } from 'hooks/useHandleExplorerTabChange';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

import { VIEWS } from './constants';

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
