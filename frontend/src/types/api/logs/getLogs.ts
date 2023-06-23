import { ILog, ILogV3 } from './log';

export type PayloadProps = ILog[];
export type PayloadPropsV3 = ILogV3[];
export type Props = {
	q: string;
	limit: number;
	orderBy: string;
	order: string;
	idGt?: string;
	idLt?: string;
	timestampStart?: number;
	timestampEnd?: number;
	id?: string;
};
