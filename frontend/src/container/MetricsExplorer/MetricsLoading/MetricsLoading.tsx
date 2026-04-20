import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { DataSource } from 'types/common/queryBuilder';

import loadingPlaneUrl from '@/assets/Icons/loading-plane.gif';

import './MetricsLoading.styles.scss';

export function MetricsLoading(): JSX.Element {
	const { t } = useTranslation('common');
	return (
		<div className="loading-metrics">
			<div className="loading-metrics-content">
				<img className="loading-gif" src={loadingPlaneUrl} alt="wait-icon" />

				<Typography>
					{t('pending_data_placeholder', { dataSource: DataSource.METRICS })}
				</Typography>
			</div>
		</div>
	);
}
