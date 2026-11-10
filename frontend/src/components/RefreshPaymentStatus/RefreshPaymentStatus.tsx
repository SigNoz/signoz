import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { refreshLicense } from 'api/generated/services/licenses';
import { Button } from '@signozhq/ui/button';
import { RefreshCcw } from '@signozhq/icons';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { buildLicenseUpdatePermission } from 'lib/authz/hooks/useAuthZ/permissions/license.permissions';
import { useAppContext } from 'providers/App/App';

export type RefreshPaymentStatusType = 'button' | 'text';

function RefreshPaymentStatus({
	type,
	withPortal,
}: {
	type?: RefreshPaymentStatusType;
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

	const buttonTypes = {
		button: {
			variant: 'link',
			color: 'secondary',
			size: 'md',
			children: t('refreshPaymentStatus'),
		},
		text: {
			variant: 'solid',
			color: 'warning',
			size: 'sm',
			children: t('refreshPaymentStatus'),
		},
	} as const satisfies Record<RefreshPaymentStatusType, unknown>;

	const button = (
		<AuthZTooltip
			checks={
				activeLicense ? [buildLicenseUpdatePermission(activeLicense.id)] : []
			}
			enabled={!!activeLicense}
			withPortal={withPortal}
		>
			<Button
				onClick={handleRefreshPaymentStatus}
				prefix={<RefreshCcw size={14} />}
				loading={isLoading}
				{...buttonTypes[type || 'button']}
			/>
		</AuthZTooltip>
	);

	return <span className="refresh-payment-status-btn-wrapper">{button}</span>;
}
RefreshPaymentStatus.defaultProps = {
	type: 'button',
	withPortal: undefined,
};

export default RefreshPaymentStatus;
