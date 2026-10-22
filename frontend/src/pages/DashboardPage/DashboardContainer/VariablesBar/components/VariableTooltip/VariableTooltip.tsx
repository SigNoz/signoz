import styles from './VariableTooltip.module.scss';
import TooltipRefSection from './TooltipRefSection';

interface VariableTooltipProps {
	description?: string;
	/** Variables this one references (its query depends on their values). */
	dependsOn: string[];
	/** Variables whose queries reference this one. */
	usedBy: string[];
}

/** Hover-tooltip body for a variable: its description plus its dependencies. */
function VariableTooltip({
	description,
	dependsOn,
	usedBy,
}: VariableTooltipProps): JSX.Element {
	const hasDependencies = dependsOn.length > 0 || usedBy.length > 0;

	return (
		<div className={styles.tooltipContent}>
			{description ? (
				<div className={styles.tooltipDescription}>{description}</div>
			) : null}

			{hasDependencies ? (
				<>
					{description ? <div className={styles.tooltipDivider} /> : null}
					{dependsOn.length > 0 ? (
						<TooltipRefSection
							label="Depends on"
							refs={dependsOn}
							direction="up"
							colorClassName={styles.dependsColor}
						/>
					) : null}
					{usedBy.length > 0 ? (
						<TooltipRefSection
							label="Used by"
							refs={usedBy}
							direction="down"
							colorClassName={styles.usedByColor}
						/>
					) : null}
				</>
			) : null}
		</div>
	);
}

export default VariableTooltip;
