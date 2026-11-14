import { Tags } from 'hooks/useResourceAttribute/types';

export interface TopOperationList {
	p50: number;
	p95: number;
	p99: number;
	numCalls: number;
	name: string;
	errorCount: number;
}

export interface Props {
	service: string;
	start: number;
	end: number;
	selectedTags: Tags[];
	isEntryPoint?: boolean;
}

export type PayloadProps = TopOperationList[];
