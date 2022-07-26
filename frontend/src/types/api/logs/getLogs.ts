import { ILog } from './log';

export type PayloadProps = ILog[];
export type Props = {
	q: string;
	limit: number;
	orderBy: string;
	order: string;
};
