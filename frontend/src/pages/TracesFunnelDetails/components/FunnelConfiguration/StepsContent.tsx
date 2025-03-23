import './StepsContent.styles.scss';

import { Button, Steps } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { PlusIcon } from 'lucide-react';
import { initialStepsData } from 'pages/TracesFunnelDetails/constants';
import { useState } from 'react';
import { FunnelStepData } from 'types/api/traceFunnels';
import { v4 } from 'uuid';

import FunnelStep from './FunnelStep';
import InterStepConfig from './InterStepConfig';

const { Step } = Steps;

interface StepsContentProps {
	stepsData: FunnelStepData[] | undefined;
}
function StepsContent({ stepsData }: StepsContentProps): JSX.Element {
	const [steps, setSteps] = useState(stepsData || initialStepsData);

	const handleAddStep = (): void => {
		setSteps((prev) => [
			...prev,
			{ ...initialStepsData[0], id: v4(), funnel_order: 3 },
		]);
	};

	return (
		<div className="steps-content">
			<OverlayScrollbar>
				<Steps direction="vertical">
					{steps.map((step, index) => (
						<Step
							key={`step-${index + 1}`}
							description={
								<div className="steps-content__description">
									<FunnelStep funnelId="1" step={step} />
									{/* Display InterStepConfig only between steps */}
									{index < steps.length - 1 && <InterStepConfig />}
								</div>
							}
						/>
					))}
					{steps.length < 3 && (
						<Step
							className="steps-content__add-step"
							description={
								<Button
									type="default"
									className="steps-content__add-btn"
									onClick={handleAddStep}
									icon={<PlusIcon size={14} />}
								>
									Add Funnel Step
								</Button>
							}
						/>
					)}
				</Steps>
			</OverlayScrollbar>
		</div>
	);
}

export default StepsContent;
