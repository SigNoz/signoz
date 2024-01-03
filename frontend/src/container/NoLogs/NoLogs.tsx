import './NoLogs.styles.scss';

import { Typography } from 'antd';
import { ArrowUpRight } from 'lucide-react';

export default function NoLogs(): JSX.Element {
	return (
		<div className="no-logs-container">
			<div className="no-logs-container-content">
				<img className="eyes-emoji" src="/Images/eyesEmoji.svg" alt="eyes emoji" />
				<Typography className="no-logs-text">
					No logs yet.{' '}
					<span className="sub-text">When we receive logs, they'd show up here</span>
				</Typography>

				<Typography.Link className="send-logs-link">
					Sending Logs to SigNoz <ArrowUpRight size={16} />
				</Typography.Link>
			</div>
		</div>
	);
}
