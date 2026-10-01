import { useMemo } from 'react';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigChips from '../../controls/ConfigChips/ConfigChips';
import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import type { SectionEditorContext } from '../../sectionContext';
import { createFieldResetter } from '../../utils/changes';
import {
	buildColorKeyItems,
	buildDimensionItems,
	getColorByHelp,
	UNSET_DIMENSION,
} from './utils';

type DimensionsSectionProps = SectionEditorProps<SectionKind.Dimensions> &
	Pick<SectionEditorContext, 'tableColumns' | 'groupColumns'>;

const VALUE_FIELDS = [
	{
		dimension: 'x',
		label: 'X axis',
		help: 'The value that places each dot left to right.',
		unsetLabel: 'Auto: first value',
	},
	{
		dimension: 'y',
		label: 'Y axis',
		help: 'The value that places each dot bottom to top.',
		unsetLabel: 'Auto: second value',
	},
	{
		dimension: 'size',
		label: 'Size',
		help:
			'Optional. Bigger values draw bigger dots; a group without one draws at the default size.',
		unsetLabel: 'None',
	},
] as const;

/**
 * Edits the `dimensions` slice of a Scatter Plot: which value column each axis
 * and the dot size read, and which group-by keys colour the dots. Options come
 * from the preview query's joined result.
 */
function DimensionsSection({
	value,
	savedValue,
	onChange,
	tableColumns = [],
	groupColumns = [],
}: DimensionsSectionProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const valueItems = useMemo(
		() =>
			tableColumns.map((column) => ({ value: column.key, label: column.label })),
		[tableColumns],
	);
	const color = value?.color ?? [];

	return (
		<>
			{VALUE_FIELDS.map(({ dimension, label, help, unsetLabel }) => (
				<ConfigField
					key={dimension}
					label={label}
					help={help}
					{...reset(dimension)}
				>
					<ConfigSelect
						testId={`panel-editor-v2-dimension-${dimension}`}
						value={value?.[dimension] ?? UNSET_DIMENSION}
						items={buildDimensionItems(valueItems, value?.[dimension], unsetLabel)}
						onChange={(next): void => onChange({ ...value, [dimension]: next })}
					/>
				</ConfigField>
			))}
			<ConfigField
				label="Colour by"
				help={getColorByHelp(color, groupColumns)}
				{...reset('color')}
			>
				<ConfigChips
					testId="panel-editor-v2-dimension-color"
					aria-label="Colour by"
					value={color}
					items={buildColorKeyItems(groupColumns, color)}
					onChange={(next): void => onChange({ ...value, color: next })}
				/>
			</ConfigField>
		</>
	);
}

export default DimensionsSection;
