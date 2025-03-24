import './StepsContent.styles.scss';

import { Button, Steps } from 'antd';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { PlusIcon } from 'lucide-react';
import { FunnelStepData } from 'types/api/traceFunnels';

import FunnelStep from './FunnelStep';
import InterStepConfig from './InterStepConfig';

const { Step } = Steps;

interface StepsContentProps {
	steps: FunnelStepData[];
	handleAddStep: () => void;
	handleStepChange: (index: number, newStep: Partial<FunnelStepData>) => void;
}

function StepsContent({
	steps,
	handleAddStep,
	handleStepChange,
}: StepsContentProps): JSX.Element {
	return (
		<div className="steps-content">
			<OverlayScrollbar>
				<Steps direction="vertical">
					{steps.map((step, index) => (
						<Step
							key={`step-${index + 1}`}
							description={
								<div className="steps-content__description">
									<FunnelStep
										funnelId="1"
										stepData={step}
										index={index}
										onStepChange={handleStepChange}
									/>
									{/* Display InterStepConfig only between steps */}
									{index < steps.length - 1 && (
										<InterStepConfig
											index={index}
											onStepChange={handleStepChange}
											step={step}
										/>
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

export default StepsContent;
