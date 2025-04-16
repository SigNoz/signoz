import './FunnelConfiguration.styles.scss';

import useFunnelConfiguration from 'hooks/TracesFunnels/useFunnelConfiguration';
import FunnelItemPopover from 'pages/TracesFunnels/components/FunnelsList/FunnelItemPopover';
import { memo } from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { FunnelData } from 'types/api/traceFunnels';

import FunnelBreadcrumb from './FunnelBreadcrumb';
import StepsContent from './StepsContent';
import StepsFooter from './StepsFooter';
import StepsHeader from './StepsHeader';

interface FunnelConfigurationProps {
	funnel: FunnelData;
	isTraceDetailsPage?: boolean;
	span?: Span;
}

function FunnelConfiguration({
	funnel,
	isTraceDetailsPage,
	span,
}: FunnelConfigurationProps): JSX.Element {
	const { isPopoverOpen, setIsPopoverOpen, steps } = useFunnelConfiguration({
		funnel,
	});

	return (
		<div className="funnel-configuration">
			{!isTraceDetailsPage && (
				<>
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
				</>
			)}
			<div className="funnel-configuration__steps-wrapper">
				<div className="funnel-configuration__steps">
					{!isTraceDetailsPage && <StepsHeader />}
					<StepsContent isTraceDetailsPage={isTraceDetailsPage} span={span} />
				</div>
				{!isTraceDetailsPage && (
					<StepsFooter
						funnelId={funnel.id}
						stepsCount={steps.length}
						funnelDescription={funnel?.description || ''}
					/>
				)}
			</div>
		</div>
	);
}

FunnelConfiguration.defaultProps = {
	isTraceDetailsPage: false,
	span: undefined,
};

export default memo(FunnelConfiguration);
