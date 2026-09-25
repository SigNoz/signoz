import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

import LogsList from '../../../components/LogsList';
import usePipelinePreview from '../../../hooks/usePipelinePreview';

import './styles.scss';

function PipelineSimulationResult({
	inputLogs,
	pipeline,
}: PipelineSimulationResultProps): JSX.Element {
	const {
		isLoading,
		outputLogs,
		collectorLogs,
		isError,
		errorMsg,
	} = usePipelinePreview({
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

	return (
		<>
			{outputLogs.length > 0 ? (
				<LogsList logs={outputLogs} />
			) : (
				<div>No logs found</div>
			)}
			{collectorLogs.length > 0 && (
				<div className="pipeline-simulation-collector-logs">
					<div className="pipeline-simulation-collector-logs-title">
						Collector logs
					</div>
					{collectorLogs.map((collectorLog) => (
						<pre key={collectorLog} className="pipeline-simulation-collector-log">
							{collectorLog}
						</pre>
					))}
				</div>
			)}
		</>
	);
}

export interface PipelineSimulationResultProps {
	inputLogs: ILog[];
	pipeline: PipelineData;
}

export default PipelineSimulationResult;
