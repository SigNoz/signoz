import { useState } from 'react';
import { useMutation } from 'react-query';
import { useLocation } from 'react-router-dom';
import { Button, Modal } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { createSubscription } from 'api/generated/services/subscriptions';
import type { CreateSubscription201 } from 'api/generated/services/sigNoz.schemas';
import { useNotifications } from 'hooks/useNotifications';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { SubscriptionCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/subscription.permissions';
import { CreditCard, MessageSquareText, X } from '@signozhq/icons';
import APIError from 'types/api/error';
import { getBaseUrl } from 'utils/basePath';

export default function ChatSupportGateway(): JSX.Element {
	const { notifications } = useNotifications();

	const [isAddCreditCardModalOpen, setIsAddCreditCardModalOpen] =
		useState(false);

	const handleBillingOnSuccess = (data: CreateSubscription201): void => {
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
		createSubscription,
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
			source: `chat support icon`,
			page: pathname,
		});

		updateCreditCard({
			url: getBaseUrl(),
		});
	};

	return (
		<>
			<div className="chat-support-gateway">
				<Button
					className="chat-support-gateway-btn"
					onClick={(): void => {
						logEvent('Disabled Chat Support: Clicked', {
							source: `chat support icon`,
							page: pathname,
						});

						setIsAddCreditCardModalOpen(true);
					}}
				>
					<MessageSquareText size={24} />
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
					<AuthZTooltip
						key="submit"
						checks={[SubscriptionCreatePermission]}
						withPortal={false}
					>
						<Button
							type="primary"
							icon={<CreditCard size={16} />}
							size="middle"
							loading={isLoadingBilling}
							disabled={isLoadingBilling}
							onClick={handleAddCreditCard}
							className="add-credit-card-btn"
						>
							Add Credit Card
						</Button>
					</AuthZTooltip>,
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
