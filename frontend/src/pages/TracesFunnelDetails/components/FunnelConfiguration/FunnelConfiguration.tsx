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
	validTracesCount: number;
	setValidTracesCount: (count: number) => void;
}

function FunnelConfiguration({
	funnel,
	validTracesCount,
	setValidTracesCount,
}: FunnelConfigurationProps): JSX.Element {
	const {
		isPopoverOpen,
		setIsPopoverOpen,
		steps,
		handleAddStep,
		handleStepChange,
		handleStepRemoval,
		isValidateStepsMutationLoading,
	} = useFunnelConfiguration({ funnel, setValidTracesCount });

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
			<div className="funnel-configuration__description">
				{funnel?.description}
			</div>
			<div className="funnel-configuration__steps-wrapper">
				<div className="funnel-configuration__steps">
					<StepsHeader />
					<StepsContent
						funnelId={funnel.id}
						steps={steps}
						handleStepChange={handleStepChange}
						handleAddStep={handleAddStep}
						handleStepRemoval={handleStepRemoval}
					/>
				</div>
				<StepsFooter
					funnelId={funnel.id}
					stepsCount={steps.length}
					validTracesCount={validTracesCount}
					funnelDescription={funnel?.description || ''}
					isLoading={isValidateStepsMutationLoading}
				/>
			</div>
		</div>
	);
}

export default FunnelConfiguration;
