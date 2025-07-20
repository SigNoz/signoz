import { TopOperationList } from 'container/MetricsApplication/TopOperationsTable';
import { Tags } from 'types/reducer/trace';

export interface Props {
	service: string;
	start: number;
	end: number;
	selectedTags: Tags[];
	isEntryPoint?: boolean;
}

export type PayloadProps = TopOperationList[];
