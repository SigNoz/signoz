import { Input } from 'antd';
import {
	DashboardtypesAxisScaleDTO,
	type DashboardtypesScatterPlotAxisDTO,
} from 'api/generated/services/sigNoz.schemas';

import ConfigInlineField from '../../controls/ConfigInlineField/ConfigInlineField';
import AxisFields from '../AxesSection/AxisFields';
import AxisRangeField from '../AxesSection/AxisRangeField';
import AxisScaleField from '../AxesSection/AxisScaleField';
import { LOG_RANGE_IGNORED_HELP, SCALE_HELP, SCALE_OPTIONS } from './options';
import { hasBoundALogAxisDrops } from './utils';

interface ScatterAxisFieldsProps {
	axis: 'x' | 'y';
	value: DashboardtypesScatterPlotAxisDTO | undefined;
	onChange: (next: DashboardtypesScatterPlotAxisDTO) => void;
	/** The name of the column the axis plots, shown until a label is typed. */
	columnName?: string;
}

function ScatterAxisFields({
	axis,
	value,
	onChange,
	columnName,
}: ScatterAxisFieldsProps): JSX.Element {
	const scale = value?.scale ?? DashboardtypesAxisScaleDTO.auto;
	const name = axis.toUpperCase();

	return (
		<AxisFields>
			<ConfigInlineField label="Label">
				<Input
					data-testid={`panel-editor-v2-${axis}-label`}
					aria-label={`${name}-axis label`}
					placeholder={columnName ?? 'None'}
					value={value?.label ?? ''}
					onChange={(event): void =>
						onChange({ ...value, label: event.target.value })
					}
				/>
			</ConfigInlineField>
			<AxisRangeField
				testIdPrefix={`panel-editor-v2-${axis}`}
				value={value}
				onChange={(bounds): void => onChange({ ...value, ...bounds })}
				help={
					hasBoundALogAxisDrops(scale, value) ? LOG_RANGE_IGNORED_HELP : undefined
				}
				helpTestId={`panel-editor-v2-${axis}-range-help`}
			/>
			<AxisScaleField
				testId={`panel-editor-v2-${axis}-scale`}
				aria-label={`${name}-axis scale`}
				value={scale}
				items={SCALE_OPTIONS}
				help={SCALE_HELP}
				onChange={(next): void => onChange({ ...value, scale: next })}
			/>
		</AxisFields>
	);
}

export default ScatterAxisFields;
