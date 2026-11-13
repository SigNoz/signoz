import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { navigate } from 'lib/router/navigation';
import { ArrowUpRight } from '@signozhq/icons';
import { DataSource } from 'types/common/queryBuilder';
import DOCLINKS from 'utils/docLinks';
import { openInNewTab } from 'utils/navigation';

import eyesEmojiUrl from '@/assets/Images/eyesEmoji.svg';

import './NoLogs.styles.scss';

export default function NoLogs({
	dataSource,
}: {
	dataSource: DataSource;
}): JSX.Element {
	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const handleLinkClick = (
		e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
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
			navigate(ROUTES.GET_STARTED_WITH_CLOUD);
		} else if (dataSource === 'traces') {
			openInNewTab(DOCLINKS.TRACES_EXPLORER_EMPTY_STATE);
		} else if (dataSource === DataSource.METRICS) {
			openInNewTab(DOCLINKS.METRICS_EXPLORER_EMPTY_STATE);
		} else {
			openInNewTab(`${DOCLINKS.USER_GUIDE}${dataSource}/`);
		}
	};
	return (
		<div className="no-logs-container">
			<div className="no-logs-container-content">
				<img className="eyes-emoji" src={eyesEmojiUrl} alt="eyes emoji" />
				<span className="no-logs-text">
					<Typography
						variant="paragraph"
						size="base"
						weight="medium"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						No {dataSource} yet.
						<span className="sub-text">
							{' '}
							When we receive {dataSource}, they would show up here
						</span>
					</Typography>
				</span>

				<div className="send-logs-link">
					<Button variant="link" color="primary" size="md" onClick={handleLinkClick}>
						Sending {dataSource} to SigNoz <ArrowUpRight size={16} />
					</Button>
				</div>
			</div>
		</div>
	);
}
