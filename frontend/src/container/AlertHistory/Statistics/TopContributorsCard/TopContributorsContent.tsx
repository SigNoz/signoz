import { Button } from 'antd';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';

import TopContributorsRows from './TopContributorsRows';
import { TopContributorsCardProps } from './types';

function TopContributorsContent({
	topContributorsData,
	totalCurrentTriggers,
}: TopContributorsCardProps): JSX.Element {
	const isEmpty = !topContributorsData.length;

	const urlQuery = useUrlQuery();
	const ruleIdKey = QueryParams.ruleId;
	const relativeTimeKey = QueryParams.relativeTime;

	const handleRedirectToOverview = (): void => {
		const params = `${ruleIdKey}=${urlQuery.get(
			ruleIdKey,
		)}&${relativeTimeKey}=${urlQuery.get(relativeTimeKey)}`;

		history.push(`${ROUTES.ALERT_OVERVIEW}?${params}`);
	};

	if (isEmpty) {
		return (
			<div className="empty-content">
				<div className="empty-content__icon">ℹ️</div>
				<div className="empty-content__text">
					<span className="bold-text">Add Group By Field</span> To view top
					contributors, please add at least one group by field to your query.
				</div>
				<div className="empty-content__button-wrapper">
					<Button
						type="default"
						className="configure-alert-rule-button"
						onClick={handleRedirectToOverview}
					>
						Configure Alert Rule
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="top-contributors-card__content">
			<TopContributorsRows
				topContributors={topContributorsData.slice(0, 3)}
				totalCurrentTriggers={totalCurrentTriggers}
			/>
		</div>
	);
}

export default TopContributorsContent;
