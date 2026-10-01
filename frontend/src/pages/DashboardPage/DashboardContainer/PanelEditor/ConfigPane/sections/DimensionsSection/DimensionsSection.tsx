import { useMemo } from 'react';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigMultiSelect from '../../controls/ConfigMultiSelect/ConfigMultiSelect';
import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import type { SectionEditorContext } from '../../sectionContext';
import { resolveAutoAxes } from '../../utils/scatterAxisColumns';

import styles from './DimensionsSection.module.scss';
import LabelWithInfo from './LabelWithInfo';
import {
	buildColorKeyItems,
	buildDimensionItems,
	formatAutoOption,
	formatColumnOption,
	UNSET_DIMENSION,
} from './utils';

type DimensionsSectionProps = SectionEditorProps<SectionKind.Dimensions> &
	Pick<SectionEditorContext, 'tableColumns' | 'groupColumns'>;

const FIELD_INFO = {
	x: 'The value column that places each dot left to right. Auto takes the first value column.',
	y: "The value column that places each dot bottom to top. Auto takes the first value column X doesn't use.",
	size:
		"Optional. Scales each dot's area by this value column; a group without a value draws at the default size.",
	color:
		'One colour and legend entry per combination of the selected keys. Leave it empty to colour by every group key.',
};

/**
 * Edits the `dimensions` slice of a Scatter Plot: which value column each axis
 * and the dot size read, and which group-by keys colour the dots. Options come
 * from the preview query's joined result.
 */
function DimensionsSection({
	value,
	onChange,
	tableColumns = [],
	groupColumns = [],
}: DimensionsSectionProps): JSX.Element {
	const valueItems = useMemo(
		() =>
			tableColumns.map((column) => ({
				value: column.key,
				label: formatColumnOption(column),
			})),
		[tableColumns],
	);
	const autoAxes = resolveAutoAxes(tableColumns, {
		x: value?.x,
		y: value?.y,
	});
	const color = value?.color ?? [];
	const colorItems = buildColorKeyItems(groupColumns, color);

	const fields = [
		{ dimension: 'x', label: 'X axis', unsetLabel: formatAutoOption(autoAxes.x) },
		{ dimension: 'y', label: 'Y axis', unsetLabel: formatAutoOption(autoAxes.y) },
		{ dimension: 'size', label: 'Size', unsetLabel: 'None' },
	] as const;

	return (
		<div className={styles.section}>
			{fields.map(({ dimension, label, unsetLabel }) => (
				<ConfigField
					key={dimension}
					label={
						<LabelWithInfo
							label={label}
							info={FIELD_INFO[dimension]}
							testId={`panel-editor-v2-dimension-${dimension}-info`}
						/>
					}
				>
					<ConfigSelect
						testId={`panel-editor-v2-dimension-${dimension}`}
						value={value?.[dimension] || UNSET_DIMENSION}
						items={buildDimensionItems(valueItems, value?.[dimension], unsetLabel)}
						onChange={(next): void => onChange({ ...value, [dimension]: next })}
					/>
				</ConfigField>
			))}
			<ConfigField
				label={
					<LabelWithInfo
						label="Colour"
						info={FIELD_INFO.color}
						testId="panel-editor-v2-dimension-color-info"
					/>
				}
			>
				<ConfigMultiSelect
					testId="panel-editor-v2-dimension-color"
					aria-label="Colour by"
					value={color}
					items={colorItems}
					placeholder={
						colorItems.length > 0 ? 'Every group key' : 'No group-by labels'
					}
					disabled={colorItems.length === 0}
					onChange={(next): void => onChange({ ...value, color: next })}
				/>
			</ConfigField>
			<p className={styles.description}>
				Each dot is one group from the query. X and Y place it, Size scales it, and
				Colour groups it in the legend.
			</p>
		</div>
	);
}

export default DimensionsSection;
