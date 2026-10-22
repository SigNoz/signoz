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
import ColorSwatches from '../../controls/ColorSwatches/ColorSwatches';
import ConfigField from '../../controls/ConfigField/ConfigField';
import { createFieldResetter } from '../../utils/changes';
import { backgroundOptions } from './background';
import BackgroundContrastNote from './BackgroundContrastNote';

/** What the picker opens on before a custom colour is chosen. */
const INITIAL_CUSTOM_COLOR = '#3A2A63';

/**
 * Edits the Text panel's `presentation` slice: body alignment and the card
 * background (TDD D7 — scoped to the text spec, not the panel envelope).
 */
function TextLayoutSection({
	value,
	savedValue,
	onChange,
}: SectionEditorProps<SectionKind.TextLayout>): JSX.Element {
	const theme = useIsDarkMode() ? PanelTheme.Dark : PanelTheme.Light;
	const background = resolveTextBackground(value?.background, theme);
	const reset = createFieldResetter(value, savedValue, onChange);

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
			<ConfigField label="Background" {...reset('background')}>
				<ColorSwatches
					testId="text-layout-background"
					label="Panel background"
					value={selectionFromResolved(background)}
					options={backgroundOptions(theme)}
					dividerAfter={1}
					onChange={(selection: TextBackgroundSelection): void =>
						onChange({
							...value,
							background: storedFromSelection(selection, theme),
						})
					}
					custom={{
						value:
							background.kind === TextBackgroundKind.Custom
								? background.surface
								: undefined,
						initial: INITIAL_CUSTOM_COLOR,
						onChange: (hex): void => onChange({ ...value, background: hex }),
						pickerFooter: (hex) => (
							<BackgroundContrastNote
								testId="text-layout-background-custom-contrast"
								color={hex}
							/>
						),
					}}
				/>
			</ConfigField>
		</>
	);
}

export default TextLayoutSection;
