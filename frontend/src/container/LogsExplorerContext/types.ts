import { ILog } from 'types/api/logs/log';

export interface LogsExplorerContextProps {
	log: ILog;
	onClose: VoidFunction;
}
