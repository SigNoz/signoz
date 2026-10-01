import { useMutation } from 'react-query';
import { Button, Modal } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { createSubscription } from 'api/generated/services/subscriptions';
import type { CreateSubscription201 } from 'api/generated/services/sigNoz.schemas';
import { useNotifications } from 'hooks/useNotifications';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { SubscriptionCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/subscription.permissions';
import { CreditCard, X } from '@signozhq/icons';
import APIError from 'types/api/error';
import { getBaseUrl } from 'utils/basePath';

interface AddCreditCardModalProps {
	open: boolean;
	onClose: () => void;
	onAddCreditCard?: () => void;
}

/**
 * Shown to trial users who have not added a card, in place of chat support.
 * Submitting creates the subscription and opens the returned billing URL.
 */
function AddCreditCardModal({
	open,
	onClose,
	onAddCreditCard,
}: AddCreditCardModalProps): JSX.Element {
	const { notifications } = useNotifications();

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
		{ onSuccess: handleBillingOnSuccess, onError: handleBillingOnError },
	);

	const handleAddCreditCard = (): void => {
		onAddCreditCard?.();
		updateCreditCard({ url: getBaseUrl() });
	};

	return (
		<Modal
			className="add-credit-card-modal"
			title={<span className="title">Add Credit Card for Chat Support</span>}
			open={open}
			closable
			onCancel={onClose}
			destroyOnClose
			footer={[
				<Button
					key="cancel"
					onClick={onClose}
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
				You&apos;re currently on <span className="highlight-text">Trial plan</span>.
				Add a credit card to access SigNoz chat support to your workspace.
			</Typography.Text>
		</Modal>
	);
}

AddCreditCardModal.defaultProps = { onAddCreditCard: undefined };

export default AddCreditCardModal;
