import './NoLogs.styles.scss';

import { Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import { ArrowUpRight } from 'lucide-react';
import { DataSource } from 'types/common/queryBuilder';
import DOCLINKS from 'utils/docLinks';

export default function NoLogs({
	dataSource,
}: {
	dataSource: DataSource;
}): JSX.Element {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const handleLinkClick = (
		e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
	): void => {
		e.preventDefault();
		e.stopPropagation();

		if (isCloudUserVal) {
			if (dataSource === DataSource.TRACES) {
				logEvent('Traces Explorer: Navigate to onboarding', {});
			} else if (dataSource === DataSource.LOGS) {
				logEvent('Logs Explorer: Navigate to onboarding', {});
			} else if (dataSource === DataSource.METRICS) {
				logEvent('Metrics Explorer: Navigate to onboarding', {});
			}
			let link;
			if (dataSource === DataSource.TRACES) {
				link = ROUTES.GET_STARTED_APPLICATION_MONITORING;
			} else if (dataSource === DataSource.METRICS) {
				link = ROUTES.GET_STARTED_WITH_CLOUD;
			} else {
				link = ROUTES.GET_STARTED_LOGS_MANAGEMENT;
			}
			history.push(link);
		} else if (dataSource === 'traces') {
			window.open(DOCLINKS.TRACES_EXPLORER_EMPTY_STATE, '_blank');
		} else if (dataSource === DataSource.METRICS) {
			window.open(DOCLINKS.METRICS_EXPLORER_EMPTY_STATE, '_blank');
		} else {
			window.open(`${DOCLINKS.USER_GUIDE}${dataSource}/`, '_blank');
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
