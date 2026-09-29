import {
	DashboardtypesTextAlignDTO,
	DashboardtypesVerticalAlignDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	resolveTextBackground,
	selectionFromResolved,
	storedFromSelection,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/resolveTextBackground';
import type { TextBackgroundSelection } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/types';
import {
	PanelTheme,
	TextBackgroundKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/types';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import AlignmentGrid from '../../controls/AlignmentGrid/AlignmentGrid';
import BackgroundSwatches from '../../controls/BackgroundSwatches/BackgroundSwatches';
import CustomBackgroundRow from '../../controls/BackgroundSwatches/CustomBackgroundRow';
import { backgroundTitle } from '../../controls/BackgroundSwatches/titles';
import ConfigField from '../../controls/ConfigField/ConfigField';
import { createFieldResetter } from '../../utils/changes';

/**
 * Edits the Text panel's `presentation` slice: body alignment and the card
 * background (TDD D7 — scoped to the text spec, not the panel envelope).
 */
function TextLayoutSection({
	value,
	defaultValue,
	onChange,
}: SectionEditorProps<SectionKind.TextLayout>): JSX.Element {
	const theme = useIsDarkMode() ? PanelTheme.Dark : PanelTheme.Light;
	const background = resolveTextBackground(value?.background, theme);
	const reset = createFieldResetter(value, defaultValue, onChange);

	return (
		<>
			<ConfigField label="Text position" {...reset('textAlign', 'verticalAlign')}>
				<AlignmentGrid
					testId="text-layout-align"
					description="Where the text sits inside the panel."
					value={{
						textAlign: value?.textAlign ?? DashboardtypesTextAlignDTO.left,
						verticalAlign: value?.verticalAlign ?? DashboardtypesVerticalAlignDTO.top,
					}}
					onChange={(alignment): void => onChange({ ...value, ...alignment })}
				/>
			</ConfigField>
			<ConfigField
				label="Background"
				help={`Selected: ${backgroundTitle(background)}`}
				{...reset('background')}
			>
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
					value={
						background.kind === TextBackgroundKind.Custom
							? background.surface
							: undefined
					}
					onChange={(hex): void => onChange({ ...value, background: hex })}
				/>
			</ConfigField>
		</>
	);
}

export default TextLayoutSection;
