import './statsCard.styles.scss';

import { DotChartOutlined } from '@ant-design/icons';
import useUrlQuery from 'hooks/useUrlQuery';
import { ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { calculateChange } from 'utils/calculateChange';

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
		return <div />;
	}
	return (
		<div
			className={`change-percentage ${
				direction ? 'change-percentage--success' : 'change-percentage--error'
			}`}
		>
			<div className="change-percentage__icon">
				{direction ? (
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
	totalCurrentCount: number;
	totalPastCount: number;
	title: string;
};

function StatsCard({
	totalCurrentCount,
	totalPastCount,
	title,
}: StatsCardProps): JSX.Element {
	const urlQuery = useUrlQuery();

	const relativeTime = urlQuery.get('relativeTime');

	const { changePercentage, changeDirection } = calculateChange(
		totalCurrentCount,
		totalPastCount,
	);

	return (
		<div className="stats-card">
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
				<div className="count-label">{totalCurrentCount}</div>

				<ChangePercentage
					direction={changeDirection}
					percentage={changePercentage}
					duration={relativeTime}
				/>
			</div>
			<div className="stats-card__graph">
				<div className="graph">
					<DotChartOutlined className="graph-icon" />
				</div>
			</div>
		</div>
	);
}

export default StatsCard;
