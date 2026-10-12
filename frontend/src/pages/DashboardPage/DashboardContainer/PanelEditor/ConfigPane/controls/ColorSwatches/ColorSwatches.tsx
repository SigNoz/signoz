import { Fragment, type ReactNode } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';

import CustomColorSwatch from './CustomColorSwatch';

import styles from './ColorSwatches.module.scss';

export interface ColorSwatchOption<T extends string> {
	value: T;
	id: string;
	label: string;
	tooltip?: string;
	fill?: string;
	pattern?: 'transparent' | 'surface';
}

interface CustomColor {
	/** The active custom color; `undefined` while a preset is selected. */
	value: string | undefined;
	initial: string;
	onChange: (hex: string) => void;
	pickerFooter?: (hex: string) => ReactNode;
}

interface ColorSwatchesProps<T extends string> {
	testId: string;
	label: string;
	value: T | undefined;
	options: ColorSwatchOption<T>[];
	dividerAfter?: number;
	onChange: (value: T) => void;
	custom: CustomColor;
}

function ColorSwatches<T extends string>({
	testId,
	label,
	value,
	options,
	dividerAfter,
	onChange,
	custom,
}: ColorSwatchesProps<T>): JSX.Element {
	return (
		<div className={styles.row} data-testid={testId}>
			<div role="radiogroup" aria-label={label} className={styles.group}>
				{options.map((option, index) => (
					<Fragment key={option.id}>
						<TooltipSimple title={option.tooltip ?? option.label} arrow>
							<label
								className={cx(styles.swatch, {
									[styles.transparent]: option.pattern === 'transparent',
									[styles.surface]: option.pattern === 'surface',
									[styles.selected]: option.value === value,
								})}
								style={option.fill ? { background: option.fill } : undefined}
								data-testid={`${testId}-${option.id}`}
							>
								<input
									type="radio"
									className={styles.input}
									name={testId}
									value={option.value}
									checked={option.value === value}
									aria-label={option.label}
									onChange={(): void => onChange(option.value)}
								/>
							</label>
						</TooltipSimple>
						{index === dividerAfter && <span className={styles.divider} />}
					</Fragment>
				))}
			</div>
			<CustomColorSwatch testId={`${testId}-custom`} {...custom} />
		</div>
	);
}

export default ColorSwatches;
