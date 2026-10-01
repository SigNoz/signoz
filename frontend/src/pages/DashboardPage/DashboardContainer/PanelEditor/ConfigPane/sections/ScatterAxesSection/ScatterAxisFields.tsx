import { Input } from 'antd';
import {
	DashboardtypesAxisScaleDTO,
	type DashboardtypesScatterPlotAxisDTO,
} from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigFieldRow from '../../controls/ConfigFieldRow/ConfigFieldRow';
import ConfigNumberInput from '../../controls/ConfigNumberInput/ConfigNumberInput';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { createFieldResetter } from '../../utils/changes';
import { SCALE_HELP, SCALE_OPTIONS } from './options';

interface ScatterAxisFieldsProps {
	axis: 'x' | 'y';
	value: DashboardtypesScatterPlotAxisDTO | undefined;
	savedValue: DashboardtypesScatterPlotAxisDTO | undefined;
	onChange: (next: DashboardtypesScatterPlotAxisDTO) => void;
}

function ScatterAxisFields({
	axis,
	value,
	savedValue,
	onChange,
}: ScatterAxisFieldsProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const name = axis.toUpperCase();
	const scale = value?.scale ?? DashboardtypesAxisScaleDTO.auto;

	return (
		<>
			<ConfigField
				label={`${name}-axis label`}
				help="Drawn along the axis, and names its value in the tooltip."
				{...reset('label')}
			>
				<Input
					data-testid={`panel-editor-v2-${axis}-label`}
					placeholder="None"
					value={value?.label ?? ''}
					onChange={(event): void =>
						onChange({ ...value, label: event.target.value })
					}
				/>
			</ConfigField>
			<ConfigField
				label={`${name}-axis range`}
				help="The axis always shows at least this range. Data outside it still stretches the axis."
				{...reset('softMin', 'softMax')}
			>
				<ConfigFieldRow>
					<ConfigNumberInput
						testId={`panel-editor-v2-${axis}-soft-min`}
						label="Min"
						value={value?.softMin}
						onChange={(softMin): void => onChange({ ...value, softMin })}
					/>
					<ConfigNumberInput
						testId={`panel-editor-v2-${axis}-soft-max`}
						label="Max"
						value={value?.softMax}
						onChange={(softMax): void => onChange({ ...value, softMax })}
					/>
				</ConfigFieldRow>
			</ConfigField>
			<ConfigField
				label={`${name}-axis scale`}
				help={SCALE_HELP[scale]}
				{...reset('scale')}
			>
				<ConfigTiles
					testId={`panel-editor-v2-${axis}-scale`}
					aria-label={`${name}-axis scale`}
					value={scale}
					items={SCALE_OPTIONS}
					onChange={(next): void => onChange({ ...value, scale: next })}
				/>
			</ConfigField>
		</>
	);
}

export default ScatterAxisFields;
