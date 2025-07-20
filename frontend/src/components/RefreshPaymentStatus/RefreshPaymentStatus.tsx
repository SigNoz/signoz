import { Button, Tooltip } from 'antd';
import refreshPaymentStatus from 'api/v3/licenses/put';
import cx from 'classnames';
import { RefreshCcw } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function RefreshPaymentStatus({
	btnShape,
	type,
}: {
	btnShape?: 'default' | 'round' | 'circle';
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
					type={type === 'text' ? 'text' : 'default'}
					shape={btnShape}
					className={cx('periscope-btn', { text: type === 'text' })}
					onClick={handleRefreshPaymentStatus}
					icon={<RefreshCcw size={14} />}
					loading={isLoading}
				>
					{type !== 'tooltip' ? t('refreshPaymentStatus') : ''}
				</Button>
			</Tooltip>
		</span>
	);
}
RefreshPaymentStatus.defaultProps = {
	btnShape: 'default',
	type: 'button',
};

export default RefreshPaymentStatus;
