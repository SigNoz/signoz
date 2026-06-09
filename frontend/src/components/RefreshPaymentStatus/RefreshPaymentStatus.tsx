import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import refreshPaymentStatus from 'api/v3/licenses/put';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { RefreshCcw } from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';

function RefreshPaymentStatus({
	type,
	className,
}: {
	type?: 'button' | 'text' | 'tooltip';
	className?: string;
}): JSX.Element {
	const { t } = useTranslation(['failedPayment']);
	const { activeLicenseRefetch } = useAppContext();

	const [isLoading, setIsLoading] = useState(false);

	const handleRefreshPaymentStatus = async (): Promise<void> => {
		setIsLoading(true);

		try {
			await refreshPaymentStatus();

			await Promise.all([activeLicenseRefetch()]);
		} catch (e) {
			console.error(e);
		}
		setIsLoading(false);
	};

	const button = (
		<Button
			variant="link"
			color={type === 'text' ? 'none' : 'secondary'}
			size="md"
			className={className}
			onClick={handleRefreshPaymentStatus}
			prefix={<RefreshCcw size={14} />}
			loading={isLoading}
		>
			{type !== 'tooltip' ? t('refreshPaymentStatus') : ''}
		</Button>
	);

	return (
		<span className="refresh-payment-status-btn-wrapper">
			{type === 'tooltip' ? (
				<TooltipSimple title={t('refreshPaymentStatus')}>{button}</TooltipSimple>
			) : (
				button
			)}
		</span>
	);
}
RefreshPaymentStatus.defaultProps = {
	type: 'button',
	className: undefined,
};

export default RefreshPaymentStatus;
