import './LogsLoading.styles.scss';

import { Typography } from 'antd';

export function LogsLoading(): JSX.Element {
	return (
		<div className="loading-logs">
			<div className="loading-logs-content">
				<img
					className="loading-gif"
					src="/Icons/loading-plane.gif"
					alt="wait-icon"
				/>

				<Typography>
					Just a bit of patience, just a little bit’s enough ⎯ we’re getting your
					logs!
				</Typography>
			</div>
		</div>
	);
}
