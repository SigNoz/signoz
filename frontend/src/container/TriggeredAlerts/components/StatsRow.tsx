import { StatCard, SEVERITY_ORDER, SEVERITY_COLORS } from 'components/Alerts';
import type { StatCardClickEvent } from 'components/Alerts';
import type { AlertStats } from '../types';
import styles from './StatsRow.module.scss';

interface StatsRowProps {
	stats: AlertStats;
	selectedFilters: string[];
	onSeverityClick: (severity: string, event: StatCardClickEvent) => void;
	onTotalClick: (event: StatCardClickEvent) => void;
}

function StatsRow({
	stats,
	selectedFilters,
	onSeverityClick,
	onTotalClick,
}: StatsRowProps): JSX.Element {
	const sortedSeverities = Object.entries(stats.bySeverity).sort(([a], [b]) => {
		const aIndex = SEVERITY_ORDER.indexOf(a.toLowerCase());
		const bIndex = SEVERITY_ORDER.indexOf(b.toLowerCase());
		if (aIndex === -1 && bIndex === -1) {
			return a.localeCompare(b);
		}
		if (aIndex === -1) {
			return 1;
		}
		if (bIndex === -1) {
			return -1;
		}
		return aIndex - bIndex;
	});

	const isSeverityActive = (severity: string): boolean =>
		selectedFilters.includes(`severity:${severity}`);

	const hasSeverityFilters = selectedFilters.some((f) =>
		f.startsWith('severity:'),
	);

	return (
		<div className={styles.statsRow}>
			<div className={styles.section}>
				<span className={styles.sectionLabel}>Total</span>
				<div className={styles.sectionCards}>
					<StatCard
						label="Alerts"
						value={stats.total}
						onClick={hasSeverityFilters ? onTotalClick : undefined}
						isActive={!hasSeverityFilters}
					/>
				</div>
			</div>
			{sortedSeverities.length > 0 && (
				<div className={styles.section}>
					<span className={styles.sectionLabel}>Severity</span>
					<div className={styles.sectionCards}>
						{sortedSeverities.map(([severity, count]) => (
							<StatCard
								key={severity}
								label={severity.charAt(0).toUpperCase() + severity.slice(1)}
								value={count}
								color={SEVERITY_COLORS[severity.toLowerCase()]}
								onClick={(e): void => onSeverityClick(severity, e)}
								isActive={isSeverityActive(severity)}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default StatsRow;
