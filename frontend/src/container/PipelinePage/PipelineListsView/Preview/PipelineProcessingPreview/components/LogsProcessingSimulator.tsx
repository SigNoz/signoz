import { Button } from 'antd';
import { useState } from 'react';
import { ILog } from 'types/api/logs/log';
import { PipelineData } from 'types/api/pipeline/def';

import PipelineSimulationResult from './PipelineSimulationResult';

function LogsProcessingSimulator({
	inputLogs,
	pipeline,
}: LogsProcessingSimulatorProps): JSX.Element {
	const [simulationInput, setSimulationInput] = useState<ILog[] | null>(null);

	const simulate = (): void => setSimulationInput(inputLogs);
	if (simulationInput !== inputLogs) {
		return (
			<div>
				<Button
					disabled={(inputLogs?.length || 0) < 1}
					type="primary"
					onClick={simulate}
				>
					Simulate Processing
				</Button>
			</div>
		);
	}

	return (
		<PipelineSimulationResult pipeline={pipeline} inputLogs={simulationInput} />
	);
}

export interface LogsProcessingSimulatorProps {
	inputLogs: ILog[];
	pipeline: PipelineData;
}

export default LogsProcessingSimulator;
