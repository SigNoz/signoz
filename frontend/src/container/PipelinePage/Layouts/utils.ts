import { PipelineData } from 'types/api/pipeline/def';

export const checkDataLength = (data: Array<PipelineData>): boolean =>
	data?.length > 0;
