import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { DataSource } from 'types/common/queryBuilder';

import loadingPlaneUrl from '@/assets/Icons/loading-plane.gif';

import './TraceLoading.styles.scss';

export function TracesLoading(): JSX.Element {
	const { t } = useTranslation('common');
	return (
		<div className="loading-traces">
			<div className="loading-traces-content">
				<img className="loading-gif" src={loadingPlaneUrl} alt="wait-icon" />

				<Typography>
					{t('pending_data_placeholder', { dataSource: DataSource.TRACES })}
				</Typography>
			</div>
		</div>
	);
}
