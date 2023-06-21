import { ILog, ILogV3 } from 'types/api/logs/log';

export default interface ICurLog {
	log: ILogV3;
	timestamp: number;
}

export interface ICurrentLog {
	log: ILog;
}
