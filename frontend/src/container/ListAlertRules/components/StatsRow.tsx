import {
	StatCard,
	STATE_ORDER,
	SEVERITY_ORDER,
	STATE_LABELS,
	STATE_COLORS,
	SEVERITY_COLORS,
} from 'components/Alerts';
import type { StatCardClickEvent } from 'components/Alerts';
import type { AlertRuleStats } from '../types';
import styles from './StatsRow.module.scss';

interface StatsRowProps {
	stats: AlertRuleStats;
	selectedFilters: string[];
	onStateClick: (state: string, event: StatCardClickEvent) => void;
	onSeverityClick: (severity: string, event: StatCardClickEvent) => void;
	onTotalClick: (event: StatCardClickEvent) => void;
}

function StatsRow({
	stats,
	selectedFilters,
	onStateClick,
	onSeverityClick,
	onTotalClick,
}: StatsRowProps): JSX.Element {
	const sortedStates = STATE_ORDER.map((state) => ({
		state,
		count: stats.byState[state] ?? 0,
	}));

	const sortedSeverities = SEVERITY_ORDER.map((severity) => ({
		severity,
		count: stats.bySeverity[severity] ?? 0,
	}));

	const isStateActive = (state: string): boolean =>
		selectedFilters.includes(`state:${state}`);

	const isSeverityActive = (severity: string): boolean =>
		selectedFilters.includes(`severity:${severity}`);

	const hasAnyFilters = selectedFilters.length > 0;

	return (
		<div className={styles.statsRow}>
			<div className={styles.section}>
				<span className={styles.sectionLabel}>Total</span>
				<div className={styles.sectionCards}>
					<StatCard
						label="Rules"
						value={stats.total}
						onClick={hasAnyFilters ? onTotalClick : undefined}
						isActive={!hasAnyFilters}
					/>
				</div>
			</div>

			{sortedStates.length > 0 && (
				<div className={styles.section}>
					<span className={styles.sectionLabel}>Status</span>
					<div className={styles.sectionCards}>
						{sortedStates.map(({ state, count }) => (
							<StatCard
								key={state}
								label={STATE_LABELS[state] ?? state}
								value={count}
								color={STATE_COLORS[state]}
								onClick={(e): void => onStateClick(state, e)}
								isActive={isStateActive(state)}
							/>
						))}
					</div>
				</div>
			)}

			{sortedSeverities.length > 0 && (
				<div className={styles.section}>
					<span className={styles.sectionLabel}>Severity</span>
					<div className={styles.sectionCards}>
						{sortedSeverities.map(({ severity, count }) => (
							<StatCard
								key={severity}
								label={severity.charAt(0).toUpperCase() + severity.slice(1)}
								value={count}
								color={SEVERITY_COLORS[severity]}
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
