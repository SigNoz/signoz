import { DrawerProps } from 'antd';
import { ChangeViewFunctionType } from 'hooks/useHandleExplorerTabChange';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

import { VIEWS } from './constants';
import { MouseEventHandler } from 'react';

export type LogDetailProps = {
	log: ILog | null;
	selectedTab: VIEWS;
	handleChangeSelectedView?: ChangeViewFunctionType;
	isListViewPanel?: boolean;
	listViewPanelSelectedFields?: IField[] | null;
	logs?: ILog[];
	onNavigateLog?: (log: ILog) => void;
	onScrollToLog?: (logId: string) => void;
	handleOpenInExplorer?: MouseEventHandler;
	getContainer?: DrawerProps['getContainer'];
	onApplyLogFilter?: (expression: string) => void;
} & Pick<DrawerProps, 'onClose'>;

export type LogDetailInnerProps = LogDetailProps & {
	log: NonNullable<LogDetailProps['log']>;
};
