import { useMutation } from 'react-query';
import { Button } from '@signozhq/ui/button';
import { Dialog } from '@signozhq/ui/dialog';
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
		<Dialog
			open={open}
			onClose={onClose}
			title="Add Credit Card for Chat Support"
			testId="add-credit-card-modal"
			footerSuffix={
				<>
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						prefix={<X size={16} />}
						onClick={onClose}
						testId="add-credit-card-cancel"
					>
						Cancel
					</Button>
					<AuthZTooltip checks={[SubscriptionCreatePermission]}>
						<Button
							variant="solid"
							color="primary"
							size="md"
							prefix={<CreditCard size={16} />}
							loading={isLoadingBilling}
							onClick={handleAddCreditCard}
							testId="add-credit-card-submit"
						>
							Add Credit Card
						</Button>
					</AuthZTooltip>
				</>
			}
		>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				You&apos;re currently on <span className="highlight-text">Trial plan</span>.
				Add a credit card to access SigNoz chat support to your workspace.
			</Typography>
		</Dialog>
	);
}

AddCreditCardModal.defaultProps = { onAddCreditCard: undefined };

export default AddCreditCardModal;
