import './StepsContent.styles.scss';

import { Button, Steps, Tooltip } from 'antd';
import logEvent from 'api/common/logEvent';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { PlusIcon, Undo2 } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useAppContext } from 'providers/App/App';
import { memo, useCallback, useMemo } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import FunnelStep from './FunnelStep';
import InterStepConfig from './InterStepConfig';

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
		if (!span || !hasEditPermission) return;

		const stepWasAdded = handleAddStep();
		if (stepWasAdded) {
			handleReplaceStep(steps.length, span.serviceName, span.name);
		}
		logEvent(
			'Trace Funnels: span added for a new step from trace details page',
			{},
		);
	}, [span, handleAddStep, handleReplaceStep, steps.length, hasEditPermission]);

	const stepItems = useMemo(
		() =>
			steps.map((step, index) => ({
				key: `step-${index + 1}`,
				description: (
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
										type="default"
										className="funnel-step-wrapper__replace-button"
										icon={<Undo2 size={12} />}
										disabled={
											(step.service_name === span.serviceName &&
												step.span_name === span.name) ||
											!hasEditPermission
										}
										onClick={(): void =>
											handleReplaceStep(index, span.serviceName, span.name)
										}
									>
										Replace
									</Button>
								</Tooltip>
							)}
						</div>
						{/* Display InterStepConfig only between steps */}
						{index < steps.length - 1 && (
							<InterStepConfig index={index} step={step} />
						)}
					</div>
				),
			})),
		[steps, isTraceDetailsPage, span, hasEditPermission, handleReplaceStep],
	);

	return (
		<div className="steps-content">
			<OverlayScrollbar>
				<>
					<Steps direction="vertical" items={stepItems} />

					{/* For now we are only supporting 3 steps */}
					{steps.length < 3 && (
						<div className="steps-content__add-step">
							{!isTraceDetailsPage ? (
								<Tooltip
									title={
										!hasEditPermission
											? 'You need editor or admin access to add steps'
											: ''
									}
								>
									<Button
										type="default"
										className="steps-content__add-btn"
										onClick={handleAddStep}
										icon={<PlusIcon size={14} />}
										disabled={!hasEditPermission}
									>
										Add Funnel Step
									</Button>
								</Tooltip>
							) : (
								<Tooltip
									title={
										!hasEditPermission
											? 'You need editor or admin access to add steps'
											: ''
									}
								>
									<Button
										type="default"
										className="steps-content__add-btn"
										onClick={handleAddForNewStep}
										icon={<PlusIcon size={14} />}
										disabled={!hasEditPermission}
									>
										Add for new Step
									</Button>
								</Tooltip>
							)}
						</div>
					)}
				</>
			</OverlayScrollbar>
		</div>
	);
}

StepsContent.defaultProps = {
	isTraceDetailsPage: false,
	span: undefined,
};

export default memo(StepsContent);
