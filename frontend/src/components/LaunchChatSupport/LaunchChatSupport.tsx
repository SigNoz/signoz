import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import AddCreditCardModal from 'components/AddCreditCardModal/AddCreditCardModal';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { FeatureKeys } from 'constants/features';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { defaultTo } from 'lodash-es';
import { CircleHelp } from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';

import './LaunchChatSupport.styles.scss';

export interface LaunchChatSupportProps {
	eventName: string;
	attributes: Record<string, unknown>;
	message?: string;
	buttonText?: string;
	className?: string;
	onHoverText?: string;
	chatMessageDisabled?: boolean;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function LaunchChatSupport({
	attributes,
	eventName,
	message = '',
	buttonText = '',
	className = '',
	onHoverText = '',
	chatMessageDisabled = false,
}: LaunchChatSupportProps): JSX.Element | null {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();
	const {
		trialInfo,
		featureFlags,
		isFetchingFeatureFlags,
		featureFlagsFetchError,
		isLoggedIn,
	} = useAppContext();
	const [isAddCreditCardModalOpen, setIsAddCreditCardModalOpen] =
		useState(false);

	const { pathname } = useLocation();

	const isChatSupportEnabled = useMemo(() => {
		if (!isFetchingFeatureFlags && (featureFlags || featureFlagsFetchError)) {
			let isChatSupportEnabled = false;

			if (featureFlags && featureFlags.length > 0) {
				isChatSupportEnabled =
					featureFlags.find((flag) => flag.name === FeatureKeys.CHAT_SUPPORT)
						?.active || false;
			}
			return isChatSupportEnabled;
		}
		return false;
	}, [featureFlags, featureFlagsFetchError, isFetchingFeatureFlags]);

	const showAddCreditCardModal = useMemo(() => {
		if (
			!isFetchingFeatureFlags &&
			(featureFlags || featureFlagsFetchError) &&
			trialInfo
		) {
			let isChatSupportEnabled = false;
			let isPremiumSupportEnabled = false;
			if (featureFlags && featureFlags.length > 0) {
				isChatSupportEnabled =
					featureFlags.find((flag) => flag.name === FeatureKeys.CHAT_SUPPORT)
						?.active || false;

				isPremiumSupportEnabled =
					featureFlags.find((flag) => flag.name === FeatureKeys.PREMIUM_SUPPORT)
						?.active || false;
			}
			return (
				isLoggedIn &&
				!isPremiumSupportEnabled &&
				isChatSupportEnabled &&
				!trialInfo.trialConvertedToSubscription &&
				isCloudUserVal
			);
		}
		return false;
	}, [
		featureFlags,
		featureFlagsFetchError,
		isCloudUserVal,
		isFetchingFeatureFlags,
		isLoggedIn,
		trialInfo,
	]);

	const handleFacingIssuesClick = (): void => {
		if (showAddCreditCardModal) {
			logEvent('Disabled Chat Support: Clicked', {
				source: `facing issues button`,
				page: pathname,
				...attributes,
			});
			setIsAddCreditCardModalOpen(true);
		} else {
			logEvent(eventName, attributes);
			if (window.pylon && !chatMessageDisabled) {
				window.Pylon('showNewMessage', defaultTo(message, ''));
			}
		}
	};

	const handleAddCreditCard = (): void => {
		logEvent('Add Credit card modal: Clicked', {
			source: `facing issues button`,
			page: pathname,
			...attributes,
		});
	};

	return isCloudUserVal && isChatSupportEnabled ? ( // Note: we would need to move this condition to license based in future
		<div className="facing-issue-button">
			<Tooltip
				title={onHoverText}
				autoAdjustOverflow
				style={{ padding: 8 }}
				overlayClassName="tooltip-overlay"
			>
				<Button
					className={cx('periscope-btn', 'facing-issue-button', className)}
					onClick={handleFacingIssuesClick}
					icon={<CircleHelp size={14} />}
				>
					{buttonText || 'Facing issues?'}
				</Button>
			</Tooltip>

			<AddCreditCardModal
				open={isAddCreditCardModalOpen}
				onClose={(): void => setIsAddCreditCardModalOpen(false)}
				onAddCreditCard={handleAddCreditCard}
			/>
		</div>
	) : null;
}

LaunchChatSupport.defaultProps = {
	message: '',
	buttonText: '',
	className: '',
	onHoverText: '',
	chatMessageDisabled: false,
};

export default LaunchChatSupport;
