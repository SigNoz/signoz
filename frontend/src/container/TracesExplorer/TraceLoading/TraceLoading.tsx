import './TraceLoading.styles.scss';

import { Typography } from 'antd';

export function TracesLoading(): JSX.Element {
	return (
		<div className="loading-traces">
			<div className="loading-traces-content">
				<img
					className="loading-gif"
					src="/Icons/loading-plane.gif"
					alt="wait-icon"
				/>

				<Typography>
					Just a bit of patience, just a little bit’s enough ⎯ we’re getting your
					traces!
				</Typography>
			</div>
		</div>
	);
}
