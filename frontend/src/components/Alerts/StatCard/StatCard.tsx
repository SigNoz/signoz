import styles from './StatCard.module.scss';

export interface StatCardClickEvent {
	exclusive: boolean;
}

interface StatCardProps {
	label: string;
	value: number;
	color?: string;
	onClick?: (event: StatCardClickEvent) => void;
	isActive?: boolean;
}

function StatCard({
	label,
	value,
	color,
	onClick,
	isActive,
}: StatCardProps): JSX.Element {
	const cardClassName = [
		styles.statCard,
		onClick && styles.statCardClickable,
		isActive && styles.statCardActive,
	]
		.filter(Boolean)
		.join(' ');

	const handleClick = (e: React.MouseEvent): void => {
		if (onClick) {
			onClick({ exclusive: e.altKey });
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent): void => {
		if (onClick && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			onClick({ exclusive: e.altKey });
		}
	};

	return (
		<div
			className={cardClassName}
			onClick={onClick ? handleClick : undefined}
			onKeyDown={onClick ? handleKeyDown : undefined}
			role={onClick ? 'button' : undefined}
			tabIndex={onClick ? 0 : undefined}
			data-testid="stat-card"
		>
			<span className={styles.statLabel} data-testid="stat-card-label">
				{label}
			</span>
			<span
				className={styles.statValue}
				style={color ? { color } : undefined}
				data-testid="stat-card-value"
			>
				{value}
			</span>
		</div>
	);
}

export default StatCard;
