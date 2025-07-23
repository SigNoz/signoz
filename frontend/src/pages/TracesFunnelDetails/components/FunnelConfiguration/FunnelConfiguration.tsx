import './FunnelConfiguration.styles.scss';

import { Button, Divider, Tooltip } from 'antd';
import cx from 'classnames';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import useFunnelConfiguration from 'hooks/TracesFunnels/useFunnelConfiguration';
import { PencilLine } from 'lucide-react';
import FunnelItemPopover from 'pages/TracesFunnels/components/FunnelsList/FunnelItemPopover';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import CopyToClipboard from 'periscope/components/CopyToClipboard';
import { useAppContext } from 'providers/App/App';
import { memo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { FunnelData } from 'types/api/traceFunnels';

import AddFunnelDescriptionModal from './AddFunnelDescriptionModal';
import FunnelBreadcrumb from './FunnelBreadcrumb';
import StepsContent from './StepsContent';
import StepsFooter from './StepsFooter';
import StepsHeader from './StepsHeader';

interface FunnelConfigurationProps {
	funnel: FunnelData;
	isTraceDetailsPage?: boolean;
	span?: Span;
	triggerAutoSave?: boolean;
	showNotifications?: boolean;
}

function FunnelConfiguration({
	funnel,
	isTraceDetailsPage,
	span,
	triggerAutoSave,
	showNotifications,
}: FunnelConfigurationProps): JSX.Element {
	const { hasEditPermission } = useAppContext();
	const { triggerSave } = useFunnelContext();
	const {
		isPopoverOpen,
		setIsPopoverOpen,
		steps,
		isSaving,
	} = useFunnelConfiguration({
		funnel,
		triggerAutoSave: triggerAutoSave || triggerSave,
		showNotifications: showNotifications || triggerSave,
	});
	const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState<boolean>(
		false,
	);

	const handleDescriptionModalClose = (): void => {
		setIsDescriptionModalOpen(false);
	};

	return (
		<div className="funnel-configuration">
			{!isTraceDetailsPage && (
				<div className="funnel-configuration__header">
					<div className="funnel-configuration__header-left">
						<FunnelBreadcrumb funnelName={funnel.funnel_name} />
					</div>
					<div className="funnel-configuration__header-right">
						<Tooltip
							title={
								// eslint-disable-next-line no-nested-ternary
								!hasEditPermission
									? 'You need editor or admin access to edit funnel description'
									: funnel?.description
									? 'Edit funnel description'
									: 'Add funnel description'
							}
						>
							<Button
								type="text"
								className="funnel-item__action-btn funnel-configuration__rename-btn"
								icon={<PencilLine size={14} />}
								onClick={(): void => setIsDescriptionModalOpen(true)}
								aria-label="Edit Funnel Description"
								disabled={!hasEditPermission}
							/>
						</Tooltip>
						<CopyToClipboard textToCopy={window.location.href} />
						<Divider type="vertical" />
						<FunnelItemPopover
							isPopoverOpen={isPopoverOpen}
							setIsPopoverOpen={setIsPopoverOpen}
							funnel={funnel}
						/>
					</div>
				</div>
			)}
			<div
				className={cx('funnel-configuration__steps-wrapper', {
					'funnel-details-page': !isTraceDetailsPage,
				})}
			>
				<OverlayScrollbar>
					<>
						{!isTraceDetailsPage && (
							<div className="funnel-configuration__description-wrapper">
								<div className="funnel-title">{funnel.funnel_name}</div>
								<div className="funnel-description">
									{funnel?.description ?? 'No description added.'}
								</div>
							</div>
						)}
						<div className="funnel-configuration__steps">
							{!isTraceDetailsPage && <StepsHeader />}
							<StepsContent isTraceDetailsPage={isTraceDetailsPage} span={span} />
						</div>
					</>
				</OverlayScrollbar>
			</div>

			{!isTraceDetailsPage && (
				<>
					<StepsFooter stepsCount={steps.length} isSaving={isSaving || false} />
					<AddFunnelDescriptionModal
						isOpen={isDescriptionModalOpen}
						onClose={handleDescriptionModalClose}
						funnelId={funnel.funnel_id}
						funnelDescription={funnel?.description || ''}
					/>
				</>
			)}
		</div>
	);
}

FunnelConfiguration.defaultProps = {
	isTraceDetailsPage: false,
	span: undefined,
	triggerAutoSave: false,
	showNotifications: false,
};

export default memo(FunnelConfiguration);
