import './NoLogs.styles.scss';

import { Typography } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { ArrowUpRight } from 'lucide-react';
import { DataSource } from 'types/common/queryBuilder';
import { isCloudUser } from 'utils/app';

export default function NoLogs({
	dataSource,
}: {
	dataSource: DataSource;
}): JSX.Element {
	const cloudUser = isCloudUser();
	const handleLinkClick = (
		e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
	): void => {
		e.preventDefault();
		e.stopPropagation();

		if (cloudUser) {
			history.push(
				dataSource === 'traces'
					? ROUTES.GET_STARTED_APPLICATION_MONITORING
					: ROUTES.GET_STARTED_LOGS_MANAGEMENT,
			);
		} else {
			window.open(`https://signoz.io/docs/userguide/${dataSource}/`, '_blank');
		}
	};
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

				<Typography.Link className="send-logs-link" onClick={handleLinkClick}>
					Sending {dataSource} to SigNoz <ArrowUpRight size={16} />
				</Typography.Link>
			</div>
		</div>
	);
}
