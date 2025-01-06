import { Button, Modal, Typography } from 'antd';
import updateCreditCardApi from 'api/billing/checkout';
import logEvent from 'api/common/logEvent';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useNotifications } from 'hooks/useNotifications';
import { CreditCard, X } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useLocation } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { CheckoutSuccessPayloadProps } from 'types/api/billing/checkout';
import { License } from 'types/api/licenses/def';

export default function ChatSupportGateway(): JSX.Element {
	const { notifications } = useNotifications();
	const [activeLicense, setActiveLicense] = useState<License | null>(null);

	const [isAddCreditCardModalOpen, setIsAddCreditCardModalOpen] = useState(
		false,
	);

	const { licenses, isFetchingLicenses } = useAppContext();

	useEffect(() => {
		if (!isFetchingLicenses && licenses) {
			const activeValidLicense =
				licenses.licenses?.find((license) => license.isCurrent === true) || null;

			setActiveLicense(activeValidLicense);
		}
	}, [licenses, isFetchingLicenses]);

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
	const { pathname } = useLocation();
	const handleAddCreditCard = (): void => {
		logEvent('Add Credit card modal: Clicked', {
			source: `intercom icon`,
			page: pathname,
		});

		updateCreditCard({
			licenseKey: activeLicense?.key || '',
			successURL: window.location.href,
			cancelURL: window.location.href,
		});
	};

	return (
		<>
			<div className="chat-support-gateway">
				<Button
					className="chat-support-gateway-btn"
					onClick={(): void => {
						logEvent('Disabled Chat Support: Clicked', {
							source: `intercom icon`,
							page: pathname,
						});

						setIsAddCreditCardModalOpen(true);
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 28 32"
						className="chat-support-gateway-btn-icon"
					>
						<path d="M28 32s-4.714-1.855-8.527-3.34H3.437C1.54 28.66 0 27.026 0 25.013V3.644C0 1.633 1.54 0 3.437 0h21.125c1.898 0 3.437 1.632 3.437 3.645v18.404H28V32zm-4.139-11.982a.88.88 0 00-1.292-.105c-.03.026-3.015 2.681-8.57 2.681-5.486 0-8.517-2.636-8.571-2.684a.88.88 0 00-1.29.107 1.01 1.01 0 00-.219.708.992.992 0 00.318.664c.142.128 3.537 3.15 9.762 3.15 6.226 0 9.621-3.022 9.763-3.15a.992.992 0 00.317-.664 1.01 1.01 0 00-.218-.707z" />
					</svg>
				</Button>
			</div>

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
		</>
	);
}
