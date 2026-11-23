import type { TopOperationList } from 'container/MetricsApplication/TopOperationsTable';
import type { Tags } from 'hooks/useResourceAttribute/types';

export interface Props {
	service: string;
	start: number;
	end: number;
	selectedTags: Tags[];
	isEntryPoint?: boolean;
}

export type PayloadProps = TopOperationList[];
