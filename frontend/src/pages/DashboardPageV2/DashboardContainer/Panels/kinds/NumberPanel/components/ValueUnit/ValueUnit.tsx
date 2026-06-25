import { Typography } from '@signozhq/ui/typography';

import styles from './ValueUnit.module.scss';

interface ValueUnitProps {
	type: 'prefix' | 'suffix';
	unit: string;
	/** Text color, set only when a "text" threshold is active. */
	color?: string;
	fontSize: string;
}

/** A prefix/suffix unit label rendered alongside the numeric value. */
function ValueUnit({
	type,
	unit,
	color,
	fontSize,
}: ValueUnitProps): JSX.Element {
	return (
		<Typography.Text
			className={styles.unit}
			data-testid={`value-display-${type}-unit`}
			style={{ color, fontSize: `calc(${fontSize} * 0.7)` }}
		>
			{unit}
		</Typography.Text>
	);
}

export default ValueUnit;
