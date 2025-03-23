import './FunnelConfiguration.styles.scss';

import FunnelItemPopover from 'pages/TracesFunnels/components/FunnelsList/FunnelItemPopover';
import { useState } from 'react';
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
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
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
					<StepsContent stepsData={funnel.steps} />
				</div>
				<StepsFooter />
			</div>
		</div>
	);
}

export default FunnelConfiguration;
