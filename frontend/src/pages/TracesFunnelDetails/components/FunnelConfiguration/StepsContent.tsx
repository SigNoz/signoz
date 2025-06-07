import './StepsContent.styles.scss';

import { Button, Steps } from 'antd';
import logEvent from 'api/common/logEvent';
import { PlusIcon, Undo2 } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { memo, useCallback } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import FunnelStep from './FunnelStep';
import InterStepConfig from './InterStepConfig';

const { Step } = Steps;

function StepsContent({
	isTraceDetailsPage,
	span,
}: {
	isTraceDetailsPage?: boolean;
	span?: Span;
}): JSX.Element {
	const { steps, handleAddStep, handleReplaceStep } = useFunnelContext();

	const handleAddForNewStep = useCallback(() => {
		if (!span) return;

		const stepWasAdded = handleAddStep();
		if (stepWasAdded) {
			handleReplaceStep(steps.length, span.serviceName, span.name);
		}
		logEvent(
			'Trace Funnels: span added for a new step from trace details page',
			{},
		);
	}, [span, handleAddStep, handleReplaceStep, steps.length]);

	return (
		<div className="steps-content">
			<Steps direction="vertical">
				{steps.map((step, index) => (
					<Step
						key={`step-${index + 1}`}
						description={
							<div className="steps-content__description">
								<div className="funnel-step-wrapper">
									<FunnelStep stepData={step} index={index} stepsCount={steps.length} />
									{isTraceDetailsPage && span && (
										<Button
											type="default"
											className="funnel-step-wrapper__replace-button"
											icon={<Undo2 size={12} />}
											disabled={
												step.service_name === span.serviceName &&
												step.span_name === span.name
											}
											onClick={(): void =>
												handleReplaceStep(index, span.serviceName, span.name)
											}
										>
											Replace
										</Button>
									)}
								</div>
								{/* Display InterStepConfig only between steps */}
								{index < steps.length - 1 && (
									// the latency type should be sent with the n+1th step
									<InterStepConfig index={index + 1} step={steps[index + 1]} />
								)}
							</div>
						}
					/>
				))}
				{/* For now we are only supporting 3 steps */}
				{steps.length < 3 && (
					<Step
						className="steps-content__add-step"
						description={
							!isTraceDetailsPage ? (
								<Button
									type="default"
									className="steps-content__add-btn"
									onClick={handleAddStep}
									icon={<PlusIcon size={14} />}
								>
									Add Funnel Step
								</Button>
							) : (
								<Button
									type="default"
									className="steps-content__add-btn"
									onClick={handleAddForNewStep}
									icon={<PlusIcon size={14} />}
								>
									Add for new Step
								</Button>
							)
						}
					/>
				)}
			</Steps>
		</div>
	);
}

StepsContent.defaultProps = {
	isTraceDetailsPage: false,
	span: undefined,
};

export default memo(StepsContent);
