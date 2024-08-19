import { Button } from 'antd';

import TopContributorsRows from './TopContributorsRows';
import { TopContributorsCardProps } from './types';

function TopContributorsContent({
	topContributorsData,
	totalCurrentTriggers,
}: TopContributorsCardProps): JSX.Element {
	const isEmpty = !topContributorsData.length;

	if (isEmpty) {
		return (
			<div className="empty-content">
				<div className="empty-content__icon">ℹ️</div>
				<div className="empty-content__text">
					<span className="bold-text">Add Group By Field</span> To view top
					contributors, please add at least one group by field to your query.
				</div>
				<div className="empty-content__button-wrapper">
					<Button type="default" className="configure-alert-rule-button">
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
