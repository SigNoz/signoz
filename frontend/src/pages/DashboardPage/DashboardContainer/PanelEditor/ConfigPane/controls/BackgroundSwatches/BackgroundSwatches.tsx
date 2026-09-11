import { Fragment } from 'react';
import { Check } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';
import {
	TEXT_BACKGROUND_PAIRS,
	TEXT_BACKGROUND_PRESETS,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/presets';
import type {
	PanelTheme,
	TextBackgroundPreset,
	TextBackgroundSelection,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/types';
import { TextBackgroundKind } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/types';

import styles from './BackgroundSwatches.module.scss';

const PRESET_TITLES: Record<TextBackgroundPreset, string> = {
	robin: 'Robin',
	purple: 'Purple',
	sakura: 'Sakura',
	cherry: 'Cherry',
	amber: 'Amber',
	forest: 'Forest',
	sienna: 'Sienna',
	slate: 'Slate',
};

type BaseSelection = TextBackgroundKind.None | TextBackgroundKind.Default;

const BASE_TITLES: Record<BaseSelection, string> = {
	none: 'Transparent',
	default: 'Default panel',
};

/** Neither base swatch shows a colour, so its tooltip says what it does. */
const BASE_TOOLTIPS: Record<BaseSelection, string> = {
	none: 'Transparent — no card, border or title bar',
	default: 'Default panel colour',
};

const OPTIONS: TextBackgroundSelection[] = [
	TextBackgroundKind.None,
	TextBackgroundKind.Default,
	...TEXT_BACKGROUND_PRESETS,
];

const DIVIDER_AFTER = 1;

interface BackgroundSwatchesProps {
	testId: string;
	/** Names the group for assistive tech — the row carries no visible label. */
	label: string;
	/** `undefined` while a custom colour is active: no swatch is selected. */
	value: TextBackgroundSelection | undefined;
	/** Swatches paint in this theme's pair, so what the user picks is what they see. */
	theme: PanelTheme;
	onChange: (value: TextBackgroundSelection) => void;
}

/**
 * The Text panel's background choices as one radio group. Native radios sharing a
 * `name`, so arrow-key movement, the single tab stop and selection-follows-focus
 * are the platform's; each input is transparent and fills its swatch.
 */
function BackgroundSwatches({
	testId,
	label,
	value,
	theme,
	onChange,
}: BackgroundSwatchesProps): JSX.Element {
	return (
		<div
			className={styles.row}
			role="radiogroup"
			aria-label={label}
			data-testid={testId}
		>
			{OPTIONS.map((option, index) => {
				const isBase =
					option === TextBackgroundKind.None ||
					option === TextBackgroundKind.Default;
				const pair = isBase ? undefined : TEXT_BACKGROUND_PAIRS[option][theme];
				const title = isBase ? BASE_TITLES[option] : PRESET_TITLES[option];

				return (
					<Fragment key={option}>
						<TooltipSimple title={isBase ? BASE_TOOLTIPS[option] : title} arrow>
							<label
								className={cx(styles.swatch, {
									[styles.checkerboard]: option === TextBackgroundKind.None,
									[styles.defaultSurface]: option === TextBackgroundKind.Default,
									[styles.selected]: option === value,
								})}
								style={pair ? { background: pair.surface, color: pair.ink } : undefined}
								data-testid={`${testId}-${option}`}
							>
								<input
									type="radio"
									className={styles.input}
									name={testId}
									value={option}
									checked={option === value}
									aria-label={title}
									onChange={(): void => onChange(option)}
								/>
								{option === value && <Check size={14} />}
							</label>
						</TooltipSimple>
						{index === DIVIDER_AFTER && <span className={styles.divider} />}
					</Fragment>
				);
			})}
		</div>
	);
}

export default BackgroundSwatches;
