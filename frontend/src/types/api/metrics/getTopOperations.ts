import { Tags } from 'types/reducer/trace';

export interface TopOperations {
	name: string;
	numCalls: number;
	p50: number;
	p95: number;
	p99: number;
}

export interface Props {
	service: string;
	start: number;
	end: number;
	selectedTags: Tags[];
}

export type PayloadProps = TopOperations[];
