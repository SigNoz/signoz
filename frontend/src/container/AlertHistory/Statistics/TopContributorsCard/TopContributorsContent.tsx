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
					Top contributors highlight the most frequently triggering group-by
					attributes in multi-dimensional alerts
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
