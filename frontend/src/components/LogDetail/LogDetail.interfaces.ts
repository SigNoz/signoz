import { AddToQueryHOCProps } from 'components/Logs/AddToQueryHOC';
import { ILog } from 'types/api/logs/log';

export type LogDetailProps = {
	log: ILog | null;
	onClose: () => void;
} & Pick<AddToQueryHOCProps, 'onAddToQuery'>;
