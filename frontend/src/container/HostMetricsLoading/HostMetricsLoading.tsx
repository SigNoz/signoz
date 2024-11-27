import './HostMetricsLoading.styles.scss';

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { DataSource } from 'types/common/queryBuilder';

export function HostMetricsLoading(): JSX.Element {
	const { t } = useTranslation('common');
	return (
		<div className="loading-host-metrics">
			<div className="loading-host-metrics-content">
				<img
					className="loading-gif"
					src="/Icons/loading-plane.gif"
					alt="wait-icon"
				/>

				<Typography>
					{t('pending_data_placeholder', {
						dataSource: `host ${DataSource.METRICS}`,
					})}
				</Typography>
			</div>
		</div>
	);
}
