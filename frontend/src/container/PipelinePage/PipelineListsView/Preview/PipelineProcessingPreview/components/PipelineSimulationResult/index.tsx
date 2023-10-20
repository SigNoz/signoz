import './styles.scss';

import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

import LogsList from '../../../components/LogsList';
import usePipelinePreview from '../../../hooks/usePipelinePreview';

function PipelineSimulationResult({
	inputLogs,
	pipeline,
}: PipelineSimulationResultProps): JSX.Element {
	const { isLoading, outputLogs, isError, errorMsg } = usePipelinePreview({
		pipeline: {
			...pipeline,
			// Ensure disabled pipelines can also be previewed
			enabled: true,
		},
		inputLogs,
	});

	if (isError) {
		return (
			<div className="pipeline-simulation-error">
				<div>There was an error</div>
				<div>{errorMsg}</div>
			</div>
		);
	}

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (outputLogs.length < 1) {
		return <div>No logs found</div>;
	}

	return <LogsList logs={outputLogs} />;
}

export interface PipelineSimulationResultProps {
	inputLogs: ILog[];
	pipeline: PipelineData;
}

export default PipelineSimulationResult;
