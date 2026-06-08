import styles from './TopContributorsContent.module.scss';
import TopContributorsRows from './TopContributorsRows';
import { TopContributorsCardProps } from './types';

function TopContributorsContent({
	topContributorsData,
	totalCurrentTriggers,
}: TopContributorsCardProps): JSX.Element {
	const isEmpty = !topContributorsData.length;

	if (isEmpty) {
		return (
			<div className={styles.emptyContent}>
				<div className={styles.emptyContentIcon}>ℹ️</div>
				<div className={styles.emptyContentText}>
					Top contributors highlight the most frequently triggering group-by
					attributes in multi-dimensional alerts
				</div>
			</div>
		);
	}

	return (
		<div className={styles.topContributorsCardContent}>
			<TopContributorsRows
				topContributors={topContributorsData.slice(0, 3)}
				totalCurrentTriggers={totalCurrentTriggers}
			/>
		</div>
	);
}

export default TopContributorsContent;
