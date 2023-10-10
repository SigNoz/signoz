import { Button } from 'antd';
import { useState } from 'react';
import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

import PipelineSimulationResult from './PipelineSimulationResult';

function LogsProcessingSimulator({
	inputLogs,
	pipeline,
}: LogsProcessingSimulatorProps): JSX.Element {
	const [showResult, setShowResult] = useState<boolean>(false);
	const simulate = (): void => setShowResult(true);

	if (!showResult) {
		return (
			<div>
				<Button type="primary" onClick={simulate}>
					Simulate Processing
				</Button>
			</div>
		);
	}

	return <PipelineSimulationResult pipeline={pipeline} inputLogs={inputLogs} />;
}

export interface LogsProcessingSimulatorProps {
	inputLogs: ILog[];
	pipeline: PipelineData;
}

export default LogsProcessingSimulator;
