import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import refreshPaymentStatus from 'api/v3/licenses/put';
import cx from 'classnames';
import { RefreshCcw } from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';
import { Button } from '@signozhq/ui/button';

function RefreshPaymentStatus({
	type,
}: {
	type?: 'button' | 'text' | 'tooltip';
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

	return (
		<span className="refresh-payment-status-btn-wrapper">
			<Tooltip title={type === 'tooltip' ? t('refreshPaymentStatus') : ''}>
				<Button
					className={cx('periscope-btn', { text: type === 'text' })}
					onClick={handleRefreshPaymentStatus}
					loading={isLoading}
					variant="outlined"
					color="secondary"
					prefix={<RefreshCcw size={14} />}
				>
					{type !== 'tooltip' ? t('refreshPaymentStatus') : ''}
				</Button>
			</Tooltip>
		</span>
	);
}
RefreshPaymentStatus.defaultProps = {
	type: 'button',
};

export default RefreshPaymentStatus;
