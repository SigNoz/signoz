import { formatCompact, formatUsd } from '../../../configUtils';
import styles from './VolumeControlStats.module.scss';

interface VolumeControlStatsProps {
	activeRules: number;
	ingestedSeries: number;
	retainedSeries: number;
	estimatedMonthlySavingsUsd: number;
}

function VolumeControlStats({
	activeRules,
	ingestedSeries,
	retainedSeries,
	estimatedMonthlySavingsUsd,
}: VolumeControlStatsProps): JSX.Element {
	const overallReduction =
		ingestedSeries > 0
			? Math.round((1 - retainedSeries / ingestedSeries) * 100)
			: 0;

	return (
		<div className={styles.stats}>
			<div className={styles.stat}>
				<span className={styles.statLabel}>Active rules</span>
				<span className={styles.statValue}>{activeRules}</span>
			</div>
			<div className={styles.stat}>
				<span className={styles.statLabel}>Ingested series</span>
				<span className={styles.statValue}>{formatCompact(ingestedSeries)}</span>
			</div>
			<div className={styles.stat}>
				<span className={styles.statLabel}>Retained series</span>
				<span className={styles.statValue}>
					{formatCompact(retainedSeries)}
					{overallReduction > 0 && (
						<span className={styles.statDelta}>−{overallReduction}%</span>
					)}
				</span>
			</div>
			<div className={`${styles.stat} ${styles.statHero}`}>
				<span className={styles.statLabel}>Est. monthly savings</span>
				<span className={`${styles.statValue} ${styles.statValueGood}`}>
					{formatUsd(estimatedMonthlySavingsUsd)}
					<span className={styles.statUnit}>/mo</span>
				</span>
			</div>
		</div>
	);
}

export default VolumeControlStats;
