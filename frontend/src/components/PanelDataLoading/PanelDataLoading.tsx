import { Typography } from 'antd';

import './PanelDataLoading.styles.scss';

export function PanelDataLoading(): JSX.Element {
	return (
		<div className="loading-panel-data">
			<div className="loading-panel-data-content">
				<img
					className="loading-gif"
					src="/Icons/loading-plane.gif"
					alt="wait-icon"
				/>

				<Typography.Text>Fetching data...</Typography.Text>
			</div>
		</div>
	);
}
