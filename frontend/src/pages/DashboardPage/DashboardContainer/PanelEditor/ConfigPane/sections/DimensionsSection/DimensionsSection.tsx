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
	sizeBy:
		"Optional. Scales each dot's area by this value column; a group without a value draws at the default size.",
	colorBy:
		'One color and legend entry per combination of the selected keys. Leave it empty to color by every group key.',
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
	const colorBy = value?.colorBy ?? [];
	const colorItems = buildColorKeyItems(groupColumns, colorBy);

	const fields = [
		{ dimension: 'x', label: 'X axis', unsetLabel: formatAutoOption(autoAxes.x) },
		{ dimension: 'y', label: 'Y axis', unsetLabel: formatAutoOption(autoAxes.y) },
		{ dimension: 'sizeBy', label: 'Size by', unsetLabel: 'None' },
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
						label="Color by"
						info={FIELD_INFO.colorBy}
						testId="panel-editor-v2-dimension-colorBy-info"
					/>
				}
			>
				<ConfigMultiSelect
					testId="panel-editor-v2-dimension-colorBy"
					aria-label="Color by"
					value={colorBy}
					items={colorItems}
					placeholder={
						colorItems.length > 0 ? 'Every group key' : 'No group-by labels'
					}
					disabled={colorItems.length === 0}
					onChange={(next): void => onChange({ ...value, colorBy: next })}
				/>
			</ConfigField>
			<p className={styles.description}>
				Each dot is one group from the query. X and Y place it, Size by scales it,
				and Color by groups it in the legend.
			</p>
		</div>
	);
}

export default DimensionsSection;
