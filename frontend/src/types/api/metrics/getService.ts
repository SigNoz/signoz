import { ServicesList } from 'types/actions/metrics';

export interface Props {
	start: number;
	end: number;
}

export type PayloadProps = ServicesList[];
