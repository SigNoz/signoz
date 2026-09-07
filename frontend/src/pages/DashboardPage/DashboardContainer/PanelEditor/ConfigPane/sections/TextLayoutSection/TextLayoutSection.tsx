import {
	DashboardtypesTextAlignDTO,
	DashboardtypesVerticalAlignDTO,
} from 'api/generated/services/sigNoz.schemas';
import { Typography } from '@signozhq/ui/typography';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	resolveTextBackground,
	selectionFromResolved,
	storedFromSelection,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/resolveTextBackground';
import type { TextBackgroundSelection } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/types';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import BackgroundSwatches from '../../controls/BackgroundSwatches/BackgroundSwatches';
import CustomBackgroundRow from '../../controls/BackgroundSwatches/CustomBackgroundRow';
import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';

import styles from './TextLayoutSection.module.scss';

const HORIZONTAL_OPTIONS = [
	{ value: DashboardtypesTextAlignDTO.left, label: 'Left' },
	{ value: DashboardtypesTextAlignDTO.center, label: 'Center' },
	{ value: DashboardtypesTextAlignDTO.right, label: 'Right' },
];

const VERTICAL_OPTIONS = [
	{ value: DashboardtypesVerticalAlignDTO.top, label: 'Top' },
	{ value: DashboardtypesVerticalAlignDTO.center, label: 'Middle' },
	{ value: DashboardtypesVerticalAlignDTO.bottom, label: 'Bottom' },
];

/**
 * Edits the Text panel's `presentation` slice: body alignment and the card
 * background (TDD D7 — scoped to the text spec, not the panel envelope).
 */
function TextLayoutSection({
	value,
	onChange,
}: SectionEditorProps<SectionKind.TextLayout>): JSX.Element {
	const theme = useIsDarkMode() ? 'dark' : 'light';
	const background = resolveTextBackground(value?.background, theme);

	return (
		<div className={styles.section}>
			<div className={styles.field}>
				<Typography.Text>Horizontal alignment</Typography.Text>
				<ConfigSegmented
					testId="text-layout-horizontal-align"
					items={HORIZONTAL_OPTIONS}
					value={value?.textAlign ?? DashboardtypesTextAlignDTO.left}
					onChange={(textAlign): void => onChange({ ...value, textAlign })}
				/>
			</div>
			<div className={styles.field}>
				<Typography.Text>Vertical alignment</Typography.Text>
				<ConfigSegmented
					testId="text-layout-vertical-align"
					items={VERTICAL_OPTIONS}
					value={value?.verticalAlign ?? DashboardtypesVerticalAlignDTO.top}
					onChange={(verticalAlign): void => onChange({ ...value, verticalAlign })}
				/>
			</div>
			<div className={styles.field}>
				<Typography.Text>Background</Typography.Text>
				<BackgroundSwatches
					testId="text-layout-background"
					label="Panel background"
					theme={theme}
					value={selectionFromResolved(background)}
					onChange={(selection: TextBackgroundSelection): void =>
						onChange({
							...value,
							background: storedFromSelection(selection, theme),
						})
					}
				/>
				<CustomBackgroundRow
					testId="text-layout-background-custom"
					value={background.kind === 'custom' ? background.surface : undefined}
					onChange={(hex): void => onChange({ ...value, background: hex })}
				/>
			</div>
		</div>
	);
}

export default TextLayoutSection;
