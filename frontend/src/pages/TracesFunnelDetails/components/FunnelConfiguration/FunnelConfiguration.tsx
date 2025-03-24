import './FunnelConfiguration.styles.scss';

import useFunnelConfiguration from 'hooks/TracesFunnels/useFunnelConfiguration';
import FunnelItemPopover from 'pages/TracesFunnels/components/FunnelsList/FunnelItemPopover';
import { FunnelData } from 'types/api/traceFunnels';

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
	const {
		isPopoverOpen,
		setIsPopoverOpen,
		steps,
		handleAddStep,
		handleStepChange,
		validTracesCount,
		isValidateStepsMutationLoading,
	} = useFunnelConfiguration({ funnel });

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
				<StepsFooter
					stepsCount={steps.length}
					validTracesCount={validTracesCount}
					isLoading={isValidateStepsMutationLoading}
				/>
			</div>
		</div>
	);
}

export default FunnelConfiguration;
