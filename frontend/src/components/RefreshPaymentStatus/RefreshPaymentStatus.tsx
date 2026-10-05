import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { refreshLicense } from 'api/generated/services/licenses';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { RefreshCcw } from '@signozhq/icons';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { buildLicenseUpdatePermission } from 'lib/authz/hooks/useAuthZ/permissions/license.permissions';
import { useAppContext } from 'providers/App/App';

function RefreshPaymentStatus({
	type,
	className,
	withPortal,
}: {
	type?: 'button' | 'text' | 'tooltip';
	className?: string;
	withPortal?: false;
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
		<AuthZTooltip
			checks={
				activeLicense ? [buildLicenseUpdatePermission(activeLicense.id)] : []
			}
			enabled={!!activeLicense}
			withPortal={withPortal}
		>
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
		</AuthZTooltip>
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
	withPortal: undefined,
};

export default RefreshPaymentStatus;
