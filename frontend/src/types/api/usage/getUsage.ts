export interface Props {
	minTime: number;
	maxTime: number;
	step: number;
	service: string;
}

export type PayloadProps = {
	count: number;
	timestamp: number;
}[];
