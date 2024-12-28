import './LaunchChatSupport.styles.scss';

import { Button, Modal, Tooltip, Typography } from 'antd';
import updateCreditCardApi from 'api/billing/checkout';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { FeatureKeys } from 'constants/features';
import { useNotifications } from 'hooks/useNotifications';
import { defaultTo } from 'lodash-es';
import { CreditCard, HelpCircle, X } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useLocation } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { CheckoutSuccessPayloadProps } from 'types/api/billing/checkout';
import { License } from 'types/api/licenses/def';
import { isCloudUser } from 'utils/app';

export interface LaunchChatSupportProps {
	eventName: string;
	attributes: Record<string, unknown>;
	message?: string;
	buttonText?: string;
	className?: string;
	onHoverText?: string;
	intercomMessageDisabled?: boolean;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function LaunchChatSupport({
	attributes,
	eventName,
	message = '',
	buttonText = '',
	className = '',
	onHoverText = '',
	intercomMessageDisabled = false,
}: LaunchChatSupportProps): JSX.Element | null {
	const isCloudUserVal = isCloudUser();
	const { notifications } = useNotifications();
	const {
		licenses,
		isFetchingLicenses,
		featureFlags,
		isFetchingFeatureFlags,
		featureFlagsFetchError,
		isLoggedIn,
	} = useAppContext();
	const [activeLicense, setActiveLicense] = useState<License | null>(null);
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
			licenses
		) {
			let isChatSupportEnabled = false;
			let isPremiumSupportEnabled = false;
			const isCloudUserVal = isCloudUser();
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
				!licenses.trialConvertedToSubscription &&
				isCloudUserVal
			);
		}
		return false;
	}, [
		featureFlags,
		featureFlagsFetchError,
		isFetchingFeatureFlags,
		isLoggedIn,
		licenses,
	]);

	useEffect(() => {
		if (!isFetchingLicenses && licenses) {
			const activeValidLicense =
				licenses.licenses?.find((license) => license.isCurrent === true) || null;
			setActiveLicense(activeValidLicense);
		}
	}, [isFetchingLicenses, licenses]);

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
			if (window.Intercom && !intercomMessageDisabled) {
				window.Intercom('showNewMessage', defaultTo(message, ''));
			}
		}
	};

	const handleBillingOnSuccess = (
		data: ErrorResponse | SuccessResponse<CheckoutSuccessPayloadProps, unknown>,
	): void => {
		if (data?.payload?.redirectURL) {
			const newTab = document.createElement('a');
			newTab.href = data.payload.redirectURL;
			newTab.target = '_blank';
			newTab.rel = 'noopener noreferrer';
			newTab.click();
		}
	};

	const handleBillingOnError = (): void => {
		notifications.error({
			message: SOMETHING_WENT_WRONG,
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
			licenseKey: activeLicense?.key || '',
			successURL: window.location.href,
			cancelURL: window.location.href,
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
	intercomMessageDisabled: false,
};

export default LaunchChatSupport;
