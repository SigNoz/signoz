import styles from './TopListHeader.module.scss';

interface HeaderTooltipProps {
	name: string;
	description: string;
}

function HeaderTooltip({ name, description }: HeaderTooltipProps): JSX.Element {
	return (
		<div data-testid="top-list-header-tooltip" className={styles.tooltip}>
			<span className={styles.tooltipName}>{name}</span>
			<span className={styles.tooltipDescription}>{description}</span>
		</div>
	);
}

export default HeaderTooltip;
