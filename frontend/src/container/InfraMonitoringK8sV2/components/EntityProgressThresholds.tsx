import { Typography } from '@signozhq/ui/typography';

import {
	EntityProgressBarType,
	THRESHOLDS_BY_TYPE,
} from './EntityProgressBar.utils';
import styles from './EntityProgressThresholds.module.scss';

interface EntityProgressThresholdsProps {
	type: EntityProgressBarType;
	note?: string;
}

export function EntityProgressThresholds({
	type,
	note,
}: EntityProgressThresholdsProps): JSX.Element {
	return (
		<div
			className={styles.container}
			data-testid={`entity-progress-thresholds-${type}`}
		>
			{note && (
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="inherit"
					as="p"
					display="inline"
					textOverflow="wrap"
				>
					{note}
				</Typography>
			)}
			{THRESHOLDS_BY_TYPE[type].map((threshold) => (
				<div key={threshold.range} className={styles.threshold}>
					<span
						className={styles.swatch}
						style={{ '--ept-color': threshold.color } as React.CSSProperties}
					/>
					<div className={styles.thresholdBody}>
						<div className={styles.thresholdHeading}>
							<Typography
								variant="paragraph"
								size="small"
								weight="medium"
								color="inherit"
								as="span"
								textOverflow="wrap"
							>
								{threshold.label}
							</Typography>
							<Typography
								variant="paragraph"
								size="small"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="visible"
								tabularNumbers
							>
								{threshold.range}
							</Typography>
						</div>
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="secondary"
							as="p"
							display="inline"
							textOverflow="wrap"
						>
							{threshold.description}
						</Typography>
					</div>
				</div>
			))}
		</div>
	);
}
