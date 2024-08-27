import './StatsCard.styles.scss';

import useUrlQuery from 'hooks/useUrlQuery';
import { ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { AlertRuleStats } from 'types/api/alerts/def';
import { calculateChange } from 'utils/calculateChange';

import StatsGraph from './StatsGraph/StatsGraph';

type ChangePercentageProps = {
	percentage: number;
	direction: number;
	duration: string | null;
};
function ChangePercentage({
	percentage,
	direction,
	duration,
}: ChangePercentageProps): JSX.Element {
	if (direction > 0) {
		return (
			<div className="change-percentage change-percentage--success">
				<div className="change-percentage__icon">
					<ArrowDownLeft size={14} color="var(--bg-forest-500)" />
				</div>
				<div className="change-percentage__label">
					{percentage}% vs Last {duration}
				</div>
			</div>
		);
	}
	if (direction < 0) {
		return (
			<div className="change-percentage change-percentage--error">
				<div className="change-percentage__icon">
					<ArrowUpRight size={14} color="var(--bg-cherry-500)" />
				</div>
				<div className="change-percentage__label">
					{percentage}% vs Last {duration}
				</div>
			</div>
		);
	}

	return (
		<div className="change-percentage change-percentage--no-previous-data">
			<div className="change-percentage__label">no previous data</div>
		</div>
	);
}

type StatsCardProps = {
	totalCurrentCount?: number;
	totalPastCount?: number;
	title: string;
	isEmpty?: boolean;
	emptyMessage?: string;
	displayValue?: string | number;
	timeSeries?: AlertRuleStats['currentTriggersSeries']['values'];
};

function StatsCard({
	displayValue,
	totalCurrentCount,
	totalPastCount,
	title,
	isEmpty,
	emptyMessage,
	timeSeries = [],
}: StatsCardProps): JSX.Element {
	const urlQuery = useUrlQuery();

	const relativeTime = urlQuery.get('relativeTime');

	const { changePercentage, changeDirection } = calculateChange(
		totalCurrentCount,
		totalPastCount,
	);

	return (
		<div className={`stats-card ${isEmpty ? 'stats-card--empty' : ''}`}>
			<div className="stats-card__title-wrapper">
				<div className="title">{title}</div>
				<div className="duration-indicator">
					<div className="icon">
						<Calendar size={14} color="var(--bg-slate-200)" />
					</div>
					<div className="text">{relativeTime}</div>
				</div>
			</div>

			<div className="stats-card__stats">
				<div className="count-label">
					{isEmpty ? emptyMessage : displayValue || totalCurrentCount}
				</div>

				<ChangePercentage
					direction={changeDirection}
					percentage={changePercentage}
					duration={relativeTime}
				/>
			</div>

			<div className="stats-card__graph">
				<div className="graph">
					{!isEmpty && timeSeries.length > 1 && (
						<StatsGraph timeSeries={timeSeries} changeDirection={changeDirection} />
					)}
				</div>
			</div>
		</div>
	);
}

StatsCard.defaultProps = {
	totalCurrentCount: 0,
	totalPastCount: 0,
	isEmpty: false,
	emptyMessage: 'No Data',
	displayValue: '',
	timeSeries: [],
};

export default StatsCard;
