import './StepsContent.styles.scss';

import { Button, Steps } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { PlusIcon } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { memo } from 'react';

import FunnelStep from './FunnelStep';
import InterStepConfig from './InterStepConfig';

const { Step } = Steps;

function StepsContent(): JSX.Element {
	const { steps, handleAddStep } = useFunnelContext();
	return (
		<div className="steps-content">
			<OverlayScrollbar>
				<Steps direction="vertical">
					{steps.map((step, index) => (
						<Step
							key={`step-${index + 1}`}
							description={
								<div className="steps-content__description">
									<FunnelStep stepData={step} index={index} stepsCount={steps.length} />
									{/* Display InterStepConfig only between steps */}
									{index < steps.length - 1 && (
										<InterStepConfig index={index} step={step} />
									)}
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

export default memo(StepsContent);
