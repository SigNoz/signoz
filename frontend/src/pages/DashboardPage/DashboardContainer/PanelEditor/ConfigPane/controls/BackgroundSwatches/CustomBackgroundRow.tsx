import type { ReactNode } from 'react';
import { Check, ChevronDown, TriangleAlert } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { ColorPicker } from 'antd';
import cx from 'classnames';
import {
	contrastRatio,
	inkForSurface,
	MIN_CONTRAST_RATIO,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/contrast';

import styles from './CustomBackgroundRow.module.scss';

const HEX_PLACEHOLDER = '#______';

/** What the picker opens on before a colour is chosen. */
const INITIAL_COLOR = '#3A2A63';

interface CustomBackgroundRowProps {
	testId: string;
	/** The stored hex while a custom colour is active; `undefined` otherwise. */
	value: string | undefined;
	onChange: (hex: string) => void;
}

/**
 * The custom colour, as a row rather than a swatch: it opens a picker instead of
 * committing a value in one click. The picker warns below the contrast floor but
 * never blocks the choice.
 */
function CustomBackgroundRow({
	testId,
	value,
	onChange,
}: CustomBackgroundRowProps): JSX.Element {
	const color = value ?? INITIAL_COLOR;
	const ratio = contrastRatio(inkForSurface(color), color);
	const isLegible = ratio >= MIN_CONTRAST_RATIO;

	const contrastMessage = isLegible
		? `Contrast ${ratio.toFixed(1)}:1`
		: `Contrast ${ratio.toFixed(1)}:1 — below ${MIN_CONTRAST_RATIO}:1`;

	function renderPanel(panel: ReactNode): ReactNode {
		return (
			<>
				{panel}
				<div
					className={cx(styles.contrast, { [styles.warning]: !isLegible })}
					data-testid={`${testId}-contrast`}
				>
					{!isLegible && <TriangleAlert size={12} />}
					<span className="translate-safe">{contrastMessage}</span>
				</div>
			</>
		);
	}

	return (
		<ColorPicker
			value={color}
			size="small"
			showText={false}
			trigger="click"
			panelRender={renderPanel}
			onChangeComplete={(next): void => onChange(next.toHexString())}
		>
			<button
				type="button"
				className={cx(styles.row, { [styles.active]: value !== undefined })}
				data-testid={testId}
			>
				<span
					className={cx(styles.chip, { [styles.chipEmpty]: value === undefined })}
					style={
						value ? { background: value, color: inkForSurface(value) } : undefined
					}
				>
					{value !== undefined && <Check size={14} />}
				</span>
				<Typography.Text className={styles.label}>Custom</Typography.Text>
				<span className={cx(styles.hex, 'translate-safe')}>
					{value ?? HEX_PLACEHOLDER}
				</span>
				<ChevronDown size={14} />
			</button>
		</ColorPicker>
	);
}

export default CustomBackgroundRow;
