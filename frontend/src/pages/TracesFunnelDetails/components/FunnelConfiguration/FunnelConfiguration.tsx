import './FunnelConfiguration.styles.scss';

import useDebounce from 'hooks/useDebounce';
import { initialStepsData } from 'pages/TracesFunnelDetails/constants';
import FunnelItemPopover from 'pages/TracesFunnels/components/FunnelsList/FunnelItemPopover';
import { useEffect, useState } from 'react';
import { FunnelData, FunnelStepData } from 'types/api/traceFunnels';
import { v4 } from 'uuid';

import FunnelBreadcrumb from './FunnelBreadcrumb';
import StepsContent from './StepsContent';
import StepsFooter from './StepsFooter';
import StepsHeader from './StepsHeader';

interface FunnelConfigurationProps {
	funnel: FunnelData;
}

function FunnelConfiguration({
	funnel,
}: FunnelConfigurationProps): JSX.Element {
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	const initialSteps = funnel.steps?.length ? funnel.steps : initialStepsData;

	const [steps, setSteps] = useState<FunnelStepData[]>(initialSteps);

	// Add debounced steps
	const debouncedSteps = useDebounce(steps, 1000);

	const handleStepChange = (
		index: number,
		newStep: Partial<FunnelStepData>,
	): void => {
		setSteps((prev) =>
			prev.map((step, i) => (i === index ? { ...step, ...newStep } : step)),
		);
	};

	const handleAddStep = (): void => {
		setSteps((prev) => [
			...prev,
			{ ...initialStepsData[0], id: v4(), funnel_order: 3 },
		]);
	};

	// Replace the useEffect with this one
	useEffect(() => {
		if (debouncedSteps !== initialSteps) {
			// Debounced API call for auto-save
			// saveStepsToAPI(debouncedSteps);
			console.log('steps debounced', debouncedSteps);
		}
	}, [debouncedSteps, initialSteps]);

	return (
		<div className="funnel-configuration">
			<div className="funnel-configuration__header">
				<FunnelBreadcrumb funnelName={funnel.funnel_name} />
				<FunnelItemPopover
					isPopoverOpen={isPopoverOpen}
					setIsPopoverOpen={setIsPopoverOpen}
					funnel={funnel}
				/>
			</div>
			<div className="funnel-configuration__steps-wrapper">
				<div className="funnel-configuration__steps">
					<StepsHeader />
					<StepsContent
						steps={steps}
						handleStepChange={handleStepChange}
						handleAddStep={handleAddStep}
					/>
				</div>
				<StepsFooter stepsCount={steps.length} validTracesCount={0} />
			</div>
		</div>
	);
}

export default FunnelConfiguration;
