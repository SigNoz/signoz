import { memo, useCallback } from 'react';
import { Steps, Tooltip } from 'antd';
import logEvent from 'api/common/logEvent';
import { Plus, Undo2 } from '@signozhq/icons';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useAppContext } from 'providers/App/App';
import { Span } from 'types/api/trace/getTraceV2';

import FunnelStep from './FunnelStep';
import InterStepConfig from './InterStepConfig';

import './StepsContent.styles.scss';
import { Button } from '@signozhq/ui/button';

const { Step } = Steps;

function StepsContent({
	isTraceDetailsPage,
	span,
}: {
	isTraceDetailsPage?: boolean;
	span?: Span;
}): JSX.Element {
	const { steps, handleAddStep, handleReplaceStep } = useFunnelContext();
	const { hasEditPermission } = useAppContext();

	const handleAddForNewStep = useCallback(() => {
		if (!span || !hasEditPermission) {
			return;
		}

		const stepWasAdded = handleAddStep();
		if (stepWasAdded) {
			handleReplaceStep(steps.length, span.serviceName, span.name);
		}
		logEvent(
			'Trace Funnels: span added for a new step from trace details page',
			{},
		);
	}, [span, handleAddStep, handleReplaceStep, steps.length, hasEditPermission]);

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
										<Tooltip
											title={
												!hasEditPermission
													? 'You need editor or admin access to replace steps'
													: ''
											}
										>
											<Button
												className="funnel-step-wrapper__replace-button"
												disabled={
													(step.service_name === span.serviceName &&
														step.span_name === span.name) ||
													!hasEditPermission
												}
												onClick={(): void =>
													handleReplaceStep(index, span.serviceName, span.name)
												}
												variant="outlined"
												color="secondary"
												prefix={<Undo2 size={12} />}
											>
												Replace
											</Button>
										</Tooltip>
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
				<Step
					className="steps-content__add-step"
					description={
						<Tooltip
							title={
								!hasEditPermission ? 'You need editor or admin access to add steps' : ''
							}
						>
							<Button
								className="steps-content__add-btn"
								onClick={isTraceDetailsPage ? handleAddForNewStep : handleAddStep}
								disabled={!hasEditPermission}
								variant="outlined"
								color="secondary"
								prefix={<Plus size={14} />}
							>
								{isTraceDetailsPage ? 'Add for new Step' : 'Add Funnel Step'}
							</Button>
						</Tooltip>
					}
				/>
			</Steps>
		</div>
	);
}

StepsContent.defaultProps = {
	isTraceDetailsPage: false,
	span: undefined,
};

export default memo(StepsContent);
