import {
	DashboardtypesPanelBackgroundDTO,
	DashboardtypesTextAlignDTO,
	DashboardtypesVerticalAlignDTO,
} from 'api/generated/services/sigNoz.schemas';
import { Typography } from '@signozhq/ui/typography';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';
import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';

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
 * Edits the Text panel's `presentation` slice: body alignment and the
 * solid/transparent card background (TDD D7 — transparency is scoped to the
 * text spec, not the panel envelope).
 */
function TextLayoutSection({
	value,
	onChange,
}: SectionEditorProps<SectionKind.TextLayout>): JSX.Element {
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
			<ConfigSwitch
				testId="text-layout-transparent"
				title="Transparent panel"
				description="Drop the card background and border — for section headers on the canvas."
				value={value?.background === DashboardtypesPanelBackgroundDTO.transparent}
				onChange={(transparent): void =>
					onChange({
						...value,
						background: transparent
							? DashboardtypesPanelBackgroundDTO.transparent
							: DashboardtypesPanelBackgroundDTO.solid,
					})
				}
			/>
		</div>
	);
}

export default TextLayoutSection;
