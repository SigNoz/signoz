import './NoLogs.styles.scss';

import { Typography } from 'antd';
import { ArrowUpRight } from 'lucide-react';
import { DataSource } from 'types/common/queryBuilder';

export default function NoLogs({
	dataSource,
}: {
	dataSource: DataSource;
}): JSX.Element {
	return (
		<div className="no-logs-container">
			<div className="no-logs-container-content">
				<img className="eyes-emoji" src="/Images/eyesEmoji.svg" alt="eyes emoji" />
				<Typography className="no-logs-text">
					No {dataSource} yet.
					<span className="sub-text">
						{' '}
						When we receive {dataSource}, they would show up here
					</span>
				</Typography>

				<Typography.Link
					className="send-logs-link"
					href={`https://signoz.io/docs/userguide/${dataSource}/`}
					target="_blank"
				>
					Sending {dataSource} to SigNoz <ArrowUpRight size={16} />
				</Typography.Link>
			</div>
		</div>
	);
}
