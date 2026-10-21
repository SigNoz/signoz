import { DashboardtypesGeoMapLayerDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigSelect, {
	type ConfigSelectItem,
} from '../../controls/ConfigSelect/ConfigSelect';
import LabelWithInfo from '../DimensionsSection/LabelWithInfo';
import { describeSize, SIZE_LABEL } from './utils';

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
	const labelOf = (key: string): string =>
		valueItems.find((item) => item.value === key)?.label ?? key;
	const colorKey = colorBy || valueItems[0]?.value || '';
	const sizeKey = sizeBy || colorKey;
	const hasValues = valueItems.length > 0;

	return (
		<>
			<ConfigField
				label={
					<LabelWithInfo
						label="Color by"
						info="The value column that sets each place's color on the ramp in Chart appearance. Auto uses the first value column."
						testId="panel-editor-v2-geo-map-color-by-info"
					/>
				}
				changed={!!colorBy}
				onReset={(): void => onChange({ colorBy: '' })}
			>
				<ConfigSelect
					testId="panel-editor-v2-geo-map-color-by"
					value={colorBy ?? ''}
					items={
						hasValues
							? [{ value: '', label: `Auto · ${labelOf(colorKey)}` }, ...valueItems]
							: NO_VALUES
					}
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
								colorLabel: labelOf(colorKey),
								sizeLabel: labelOf(sizeKey),
							})
						: 'Value columns appear after the query runs.'
				}
			>
				<ConfigSelect
					testId="panel-editor-v2-geo-map-size-by"
					value={sizeBy ?? ''}
					items={
						hasValues
							? [
									{
										value: '',
										label:
											layer === DashboardtypesGeoMapLayerDTO.regions
												? 'None'
												: `Same as color · ${labelOf(colorKey)}`,
									},
									...valueItems,
								]
							: NO_VALUES
					}
					onChange={(next): void => onChange({ sizeBy: next })}
				/>
			</ConfigField>
		</>
	);
}

export default ValueColumnsFields;
