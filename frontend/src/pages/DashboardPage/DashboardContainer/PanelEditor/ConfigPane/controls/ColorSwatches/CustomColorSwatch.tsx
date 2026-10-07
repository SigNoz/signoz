import type { ReactNode } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { ColorPicker } from 'antd';
import cx from 'classnames';

import styles from './ColorSwatches.module.scss';

interface CustomColorSwatchProps {
	testId: string;
	value: string | undefined;
	initial: string;
	onChange: (hex: string) => void;
	pickerFooter?: (hex: string) => ReactNode;
}

function CustomColorSwatch({
	testId,
	value,
	initial,
	onChange,
	pickerFooter,
}: CustomColorSwatchProps): JSX.Element {
	const color = value ?? initial;
	const title = value ? `Custom ${value.toUpperCase()}` : 'Custom color';

	return (
		<ColorPicker
			value={color}
			trigger="click"
			panelRender={
				pickerFooter
					? (panel): ReactNode => (
							<>
								{panel}
								{pickerFooter(color)}
							</>
						)
					: undefined
			}
			onChangeComplete={(next): void => onChange(next.toHexString())}
		>
			<span className={styles.customAnchor}>
				<TooltipSimple title={title} arrow>
					<button
						type="button"
						aria-label={title}
						aria-pressed={value !== undefined}
						className={cx(styles.swatch, styles.custom, {
							[styles.selected]: value !== undefined,
						})}
						data-testid={testId}
					/>
				</TooltipSimple>
			</span>
		</ColorPicker>
	);
}

export default CustomColorSwatch;
