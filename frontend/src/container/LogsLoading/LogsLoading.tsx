import './LogsLoading.styles.scss';

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { DataSource } from 'types/common/queryBuilder';

export function LogsLoading(): JSX.Element {
	const { t } = useTranslation('common');
	return (
		<div className="loading-logs">
			<div className="loading-logs-content">
				<img
					className="loading-gif"
					src="/Icons/loading-plane.gif"
					alt="wait-icon"
				/>

				<Typography>
					{t('pending_data_placeholder', { dataSource: DataSource.LOGS })}
				</Typography>
			</div>
		</div>
	);
}
