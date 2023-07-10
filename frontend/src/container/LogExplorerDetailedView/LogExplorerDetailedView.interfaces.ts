import { ILog } from 'types/api/logs/log';

export type LogExplorerDetailedViewProps = {
	log: ILog | null;
	onClose: () => void;
};
