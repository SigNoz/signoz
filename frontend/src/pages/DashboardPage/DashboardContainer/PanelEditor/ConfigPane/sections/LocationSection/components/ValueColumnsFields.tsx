import { useMemo } from 'react';
import { DashboardtypesGeoMapLayerDTO } from 'api/generated/services/sigNoz.schemas';
import {
	SECTION_METADATA,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../../controls/ConfigField/ConfigField';
import ConfigSelect, {
	type ConfigSelectItem,
} from '../../../controls/ConfigSelect/ConfigSelect';
import LabelWithInfo from '../../DimensionsSection/LabelWithInfo';
import { describeSize } from '../utils/descriptions';
import { labelOfItem, SIZE_LABEL } from '../utils/options';

const NO_VALUES: ConfigSelectItem[] = [
	{ value: '', label: 'Run the query to see value columns' },
];

interface ValueColumnsFieldsProps {
	layer: DashboardtypesGeoMapLayerDTO;
	valueItems: ConfigSelectItem[];
	colorBy: string | undefined;
	sizeBy: string | undefined;
	onChange: (patch: { colorBy?: string; sizeBy?: string }) => void;
}

/** Which value column colors each place and which sizes its circle; Auto names its pick. */
function ValueColumnsFields({
	layer,
	valueItems,
	colorBy,
	sizeBy,
	onChange,
}: ValueColumnsFieldsProps): JSX.Element {
	const colorKey = colorBy || valueItems[0]?.value || '';
	const colorLabel = labelOfItem(valueItems, colorKey);
	const sizeLabel = labelOfItem(valueItems, sizeBy || colorKey);
	const hasValues = valueItems.length > 0;
	const colorItems = useMemo(
		() =>
			hasValues
				? [{ value: '', label: `Auto · ${colorLabel}` }, ...valueItems]
				: NO_VALUES,
		[hasValues, colorLabel, valueItems],
	);
	const sizeItems = useMemo(
		() =>
			hasValues
				? [
						{
							value: '',
							label:
								layer === DashboardtypesGeoMapLayerDTO.regions
									? 'None'
									: `Same as color · ${colorLabel}`,
						},
						...valueItems,
					]
				: NO_VALUES,
		[hasValues, colorLabel, valueItems, layer],
	);

	return (
		<>
			<ConfigField
				label={
					<LabelWithInfo
						label="Color by"
						info={`The value column that sets each place's color on the ramp in ${SECTION_METADATA[SectionKind.ChartAppearance].title}. Auto uses the first value column.`}
						testId="panel-editor-v2-geo-map-color-by-info"
					/>
				}
				changed={!!colorBy}
				onReset={(): void => onChange({ colorBy: '' })}
			>
				<ConfigSelect
					testId="panel-editor-v2-geo-map-color-by"
					value={colorBy ?? ''}
					items={colorItems}
					onChange={(next): void => onChange({ colorBy: next })}
				/>
			</ConfigField>
			<ConfigField
				label={SIZE_LABEL[layer]}
				changed={!!sizeBy}
				onReset={(): void => onChange({ sizeBy: '' })}
				help={
					hasValues
						? describeSize({
								layer,
								sizeBy,
								colorLabel,
								sizeLabel,
							})
						: 'Value columns appear after the query runs.'
				}
			>
				<ConfigSelect
					testId="panel-editor-v2-geo-map-size-by"
					value={sizeBy ?? ''}
					items={sizeItems}
					onChange={(next): void => onChange({ sizeBy: next })}
				/>
			</ConfigField>
		</>
	);
}

export default ValueColumnsFields;
