import './LaunchChatSupport.styles.scss';

import { Button, Modal, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import updateCreditCardApi from 'api/v1/checkout/create';
import cx from 'classnames';
import { FeatureKeys } from 'constants/features';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useNotifications } from 'hooks/useNotifications';
import { defaultTo } from 'lodash-es';
import { CreditCard, HelpCircle, X } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useLocation } from 'react-router-dom';
import { SuccessResponseV2 } from 'types/api';
import { CheckoutSuccessPayloadProps } from 'types/api/billing/checkout';
import APIError from 'types/api/error';

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
	const { notifications } = useNotifications();
	const {
		trialInfo,
		featureFlags,
		isFetchingFeatureFlags,
		featureFlagsFetchError,
		isLoggedIn,
	} = useAppContext();
	const [isAddCreditCardModalOpen, setIsAddCreditCardModalOpen] = useState(
		false,
	);

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
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				window.Pylon('showNewMessage', defaultTo(message, ''));
			}
		}
	};

	const handleBillingOnSuccess = (
		data: SuccessResponseV2<CheckoutSuccessPayloadProps>,
	): void => {
		if (data?.data?.redirectURL) {
			const newTab = document.createElement('a');
			newTab.href = data.data.redirectURL;
			newTab.target = '_blank';
			newTab.rel = 'noopener noreferrer';
			newTab.click();
		}
	};

	const handleBillingOnError = (error: APIError): void => {
		notifications.error({
			message: error.getErrorCode(),
			description: error.getErrorMessage(),
		});
	};

	const { mutate: updateCreditCard, isLoading: isLoadingBilling } = useMutation(
		updateCreditCardApi,
		{
			onSuccess: (data) => {
				handleBillingOnSuccess(data);
			},
			onError: handleBillingOnError,
		},
	);

	const handleAddCreditCard = (): void => {
		logEvent('Add Credit card modal: Clicked', {
			source: `facing issues button`,
			page: pathname,
			...attributes,
		});

		updateCreditCard({
			url: window.location.origin,
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
					icon={<HelpCircle size={14} />}
				>
					{buttonText || 'Facing issues?'}
				</Button>
			</Tooltip>

			{/* Add Credit Card Modal */}
			<Modal
				className="add-credit-card-modal"
				title={<span className="title">Add Credit Card for Chat Support</span>}
				open={isAddCreditCardModalOpen}
				closable
				onCancel={(): void => setIsAddCreditCardModalOpen(false)}
				destroyOnClose
				footer={[
					<Button
						key="cancel"
						onClick={(): void => setIsAddCreditCardModalOpen(false)}
						className="cancel-btn"
						icon={<X size={16} />}
					>
						Cancel
					</Button>,
					<Button
						key="submit"
						type="primary"
						icon={<CreditCard size={16} />}
						size="middle"
						loading={isLoadingBilling}
						disabled={isLoadingBilling}
						onClick={handleAddCreditCard}
						className="add-credit-card-btn"
					>
						Add Credit Card
					</Button>,
				]}
			>
				<Typography.Text className="add-credit-card-text">
					You&apos;re currently on <span className="highlight-text">Trial plan</span>
					. Add a credit card to access SigNoz chat support to your workspace.
				</Typography.Text>
			</Modal>
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
