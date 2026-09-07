import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { refreshLicense } from 'api/generated/services/licenses';
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
	const { activeLicense, activeLicenseRefetch } = useAppContext();

	const [isLoading, setIsLoading] = useState(false);

	const handleRefreshPaymentStatus = async (): Promise<void> => {
		if (!activeLicense) {
			return;
		}

		setIsLoading(true);

		try {
			await refreshLicense({ id: activeLicense.id });

			activeLicenseRefetch();
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
