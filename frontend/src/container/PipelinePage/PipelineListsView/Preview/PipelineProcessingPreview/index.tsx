import './styles.scss';

import { RelativeDurationOptions } from 'container/TopNav/DateTimeSelection/config';
import { useState } from 'react';
import { PipelineData } from 'types/api/pipeline/def';

import PreviewIntervalSelector from '../components/PreviewIntervalSelector';
import SampleLogsResponseDisplay from '../components/SampleLogs/SampleLogsResponseDisplay';
import useSampleLogs from '../hooks/useSampleLogs';
import LogsProcessingSimulator from './components/LogsProcessingSimulator';

function PipelineProcessingPreview({
	pipeline,
}: PipelineProcessingPreviewProps): JSX.Element {
	const last1HourInterval = RelativeDurationOptions[3].value;
	const [logsSampleQueryInterval, setLogsSampleQueryInterval] = useState(
		last1HourInterval,
	);

	const sampleLogsResponse = useSampleLogs({
		filter: pipeline.filter,
		timeInterval: logsSampleQueryInterval,
		count: 5,
	});

	const { logs: sampleLogs } = sampleLogsResponse;

	return (
		<div>
			<div className="pipeline-preview-section-header">
				<div>Sample logs</div>
				<PreviewIntervalSelector
					previewFilter={pipeline.filter}
					value={logsSampleQueryInterval}
					onChange={setLogsSampleQueryInterval}
				/>
			</div>
			<div className="pipeline-preview-logs-container">
				<SampleLogsResponseDisplay response={sampleLogsResponse} />
			</div>
			<div className="pipeline-preview-section-header">
				<div>Processed Output</div>
			</div>
			<div className="pipeline-preview-logs-container">
				<LogsProcessingSimulator inputLogs={sampleLogs} pipeline={pipeline} />
			</div>
		</div>
	);
}

export interface PipelineProcessingPreviewProps {
	pipeline: PipelineData;
}

export default PipelineProcessingPreview;
