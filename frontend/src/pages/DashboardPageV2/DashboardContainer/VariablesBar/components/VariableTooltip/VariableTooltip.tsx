import cx from 'classnames';

import styles from './VariableTooltip.module.scss';

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
						<div className={styles.tooltipSection}>
							<div className={cx(styles.tooltipLabel, styles.dependsColor)}>
								Depends on
							</div>
							<div className={styles.tooltipRefs}>
								{dependsOn.map((name) => (
									<span
										key={name}
										className={cx(styles.tooltipRef, styles.dependsColor)}
									>
										${name}
									</span>
								))}
							</div>
						</div>
					) : null}
					{usedBy.length > 0 ? (
						<div className={styles.tooltipSection}>
							<div className={cx(styles.tooltipLabel, styles.usedByColor)}>
								Used by
							</div>
							<div className={styles.tooltipRefs}>
								{usedBy.map((name) => (
									<span key={name} className={cx(styles.tooltipRef, styles.usedByColor)}>
										${name}
									</span>
								))}
							</div>
						</div>
					) : null}
				</>
			) : null}
		</div>
	);
}

export default VariableTooltip;
