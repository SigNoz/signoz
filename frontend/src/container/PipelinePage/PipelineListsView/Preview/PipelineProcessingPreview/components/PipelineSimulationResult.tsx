import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

import LogsResponseDisplay from '../../components/LogsResponseDisplay';
import usePipelinePreview from '../../hooks/usePipelinePreview';

function PipelineSimulationResult({
	inputLogs,
	pipeline,
}: PipelineSimulationResultProps): JSX.Element {
	const simulationResult = usePipelinePreview({ pipeline, logs: inputLogs });

	return <LogsResponseDisplay response={simulationResult} />;
}

export interface PipelineSimulationResultProps {
	inputLogs: ILog[];
	pipeline: PipelineData;
}

export default PipelineSimulationResult;
