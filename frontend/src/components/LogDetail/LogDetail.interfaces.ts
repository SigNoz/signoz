import { DrawerProps } from 'antd';
import { AddToQueryHOCProps } from 'components/Logs/AddToQueryHOC';
import { ActionItemProps } from 'container/LogDetailedView/ActionItem';
import { ILog } from 'types/api/logs/log';

export type LogDetailProps = {
	log: ILog | null;
} & Pick<AddToQueryHOCProps, 'onAddToQuery'> &
	Pick<ActionItemProps, 'onClickActionItem'> &
	Pick<DrawerProps, 'onClose'>;
