import './statsCard.styles.scss';

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
	if (!percentage || !duration) {
		return <div className="change-percentage" />;
	}
	return (
		<div
			className={`change-percentage ${
				direction > 0 ? 'change-percentage--success' : 'change-percentage--error'
			}`}
		>
			<div className="change-percentage__icon">
				{direction > 0 ? (
					<ArrowDownLeft size={14} color="var(--bg-forest-500)" />
				) : (
					<ArrowUpRight size={14} color="var(--bg-cherry-500)" />
				)}
			</div>
			<div className="change-percentage__label">
				{percentage}% vs Last {duration}
			</div>
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
					{!isEmpty && !!timeSeries.length && (
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
