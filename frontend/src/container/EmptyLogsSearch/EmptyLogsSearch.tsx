import './EmptyLogsSearch.styles.scss';

import { Typography } from 'antd';

export default function EmptyLogsSearch(): JSX.Element {
	return (
		<div className="empty-logs-search-container">
			<div className="empty-logs-search-container-content">
				<img
					src="/Icons/emptyState.svg"
					alt="thinking-emoji"
					className="empty-state-svg"
				/>
				<Typography.Text>
					<span className="sub-text">This query had no results. </span>
					Edit your query and try again!
				</Typography.Text>
			</div>
		</div>
	);
}
