import { ColorPicker } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';

import styles from './LegendColors.module.scss';

interface LegendColorRowProps {
	label: string;
	/** Effective color shown in the swatch (override or auto). */
	color: string;
	/** True when the series has an explicit override (enables Reset). */
	isOverridden: boolean;
	onChange: (hex: string) => void;
	onReset: () => void;
}

/**
 * One series row in the legend-colors list: an antd ColorPicker swatch trigger, the
 * series label, and a Reset action shown only when the color is overridden. `onChange`
 * fires on commit (`onChangeComplete`) so dragging the picker doesn't churn the spec.
 */
function LegendColorRow({
	label,
	color,
	isOverridden,
	onChange,
	onReset,
}: LegendColorRowProps): JSX.Element {
	return (
		<div className={styles.row}>
			<ColorPicker
				value={color}
				size="small"
				showText={false}
				trigger="click"
				onChangeComplete={(next): void => onChange(next.toHexString())}
			>
				<button
					type="button"
					className={styles.trigger}
					data-testid={`legend-color-${label}`}
				>
					<span className={styles.swatch} style={{ backgroundColor: color }} />
					<Typography.Text className={styles.label} title={label}>
						{label}
					</Typography.Text>
				</button>
			</ColorPicker>
			{isOverridden && (
				<Button
					size="sm"
					color="secondary"
					variant="ghost"
					onClick={onReset}
					testId={`legend-color-reset-${label}`}
				>
					Reset
				</Button>
			)}
		</div>
	);
}

export default LegendColorRow;
