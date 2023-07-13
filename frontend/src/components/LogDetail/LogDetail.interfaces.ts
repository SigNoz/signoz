import { AddToQueryHOCProps } from 'components/Logs/AddToQueryHOC';
import { ActionItemProps } from 'container/LogDetailedView/ActionItem';
import { ILog } from 'types/api/logs/log';

export type LogDetailProps = {
	log: ILog | null;
	onClose: () => void;
} & Pick<AddToQueryHOCProps, 'onAddToQuery'> &
	Pick<ActionItemProps, 'onClickActionItem'>;
