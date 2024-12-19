import { MouseEventHandler } from 'react';
import { ILog } from 'types/api/logs/log';

export interface LogsExplorerContextProps {
	log: ILog;
	onClose: MouseEventHandler<HTMLElement>;
}
