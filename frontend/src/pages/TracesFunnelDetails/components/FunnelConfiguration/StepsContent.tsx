import './StepsContent.styles.scss';

import { Button, Steps } from 'antd';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';

import FunnelStep from './FunnelStep';
import InterStepConfig from './InterStepConfig';

const { Step } = Steps;

function StepsContent(): JSX.Element {
	const [steps, setSteps] = useState([{}, {}]);

	const handleAddStep = (): void => {
		setSteps((prev) => [...prev, {}]);
	};

	return (
		<div className="steps-content">
			<Steps direction="vertical">
				{steps.map((_, index) => (
					<Step
						key={`step-${index + 1}`}
						description={
							<div className="steps-content__description">
								<FunnelStep />
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
		</div>
	);
}

export default StepsContent;
