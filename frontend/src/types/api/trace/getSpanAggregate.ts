export interface Props {
	start: number;
	end: number;
	service: string;
	operation: string;
	maxDuration: string;
	minDuration: string;
	kind: string;
	tags: string;
	dimension: string;
	aggregation_option: string;
	step: string;
}

interface Timestamp {
	timestamp: number;
	value: number;
}

export type PayloadProps = Timestamp[];
