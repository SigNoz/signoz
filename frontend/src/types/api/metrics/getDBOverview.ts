import { Tags } from 'hooks/useResourceAttribute/types';

export interface Props {
	service: string;
	start: number;
	end: number;
	step: number;
	selectedTags: Tags[];
}

export interface DBOverView {
	avgDuration: number;
	callRate: number;
	externalHttpUrl: string;
	numCalls: number;
	timestamp: number;
}

export type PayloadProps = DBOverView[];
