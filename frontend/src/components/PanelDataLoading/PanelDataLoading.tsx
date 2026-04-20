import { Typography } from 'antd';

import loadingPlaneUrl from '@/assets/Icons/loading-plane.gif';

import './PanelDataLoading.styles.scss';

export function PanelDataLoading(): JSX.Element {
	return (
		<div className="loading-panel-data">
			<div className="loading-panel-data-content">
				<img className="loading-gif" src={loadingPlaneUrl} alt="wait-icon" />

				<Typography.Text>Fetching data...</Typography.Text>
			</div>
		</div>
	);
}
