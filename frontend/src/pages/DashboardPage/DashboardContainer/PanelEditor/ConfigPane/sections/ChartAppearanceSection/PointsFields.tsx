import type { DashboardtypesScatterPlotPointsDTO } from 'api/generated/services/sigNoz.schemas';
import {
	POINT_OPACITY_BOUNDS,
	POINT_SIZE_BOUNDS,
	resolvePointOpacity,
	resolvePointSize,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/ScatterPlotPanel/utils/points';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigRangeSlider from '../../controls/ConfigRangeSlider/ConfigRangeSlider';
import ConfigSlider from '../../controls/ConfigSlider/ConfigSlider';
import { createFieldResetter } from '../../utils/changes';
import { formatOpacity, formatPointSize, formatPointSizeRange } from './utils';

const OPACITY_STEP = 0.01;

interface PointsFieldsProps {
	value: DashboardtypesScatterPlotPointsDTO | undefined;
	savedValue: DashboardtypesScatterPlotPointsDTO | undefined;
	onChange: (next: DashboardtypesScatterPlotPointsDTO) => void;
	/** The column dots are sized by; unset draws every dot at one size. */
	sizeColumnLabel?: string;
}

function PointsFields({
	value,
	savedValue,
	onChange,
	sizeColumnLabel,
}: PointsFieldsProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	// The renderer's defaults, so a thumb starts where an unset field draws.
	const size = resolvePointSize(value);

	return (
		<>
			{sizeColumnLabel ? (
				<ConfigField
					label="Point size"
					help={`Each dot's area scales with ${sizeColumnLabel} between min and max.`}
					{...reset('minSize', 'maxSize')}
				>
					<ConfigRangeSlider
						testId="panel-editor-v2-point-size-range"
						value={[size.min, size.max]}
						min={POINT_SIZE_BOUNDS.min}
						max={POINT_SIZE_BOUNDS.max}
						step={1}
						formatValue={formatPointSizeRange}
						onChange={([minSize, maxSize]): void =>
							onChange({ ...value, minSize, maxSize })
						}
					/>
				</ConfigField>
			) : (
				<ConfigField
					label="Point size"
					help="Every dot uses this size. Map a Size column to draw a bubble chart."
					{...reset('size')}
				>
					<ConfigSlider
						testId="panel-editor-v2-point-size"
						value={size.fixed}
						min={POINT_SIZE_BOUNDS.min}
						max={POINT_SIZE_BOUNDS.max}
						step={1}
						formatValue={formatPointSize}
						onChange={(next): void => onChange({ ...value, size: next })}
					/>
				</ConfigField>
			)}
			<ConfigField label="Fill opacity" {...reset('opacity')}>
				<ConfigSlider
					testId="panel-editor-v2-point-opacity"
					value={resolvePointOpacity(value)}
					min={POINT_OPACITY_BOUNDS.min}
					max={POINT_OPACITY_BOUNDS.max}
					step={OPACITY_STEP}
					formatValue={formatOpacity}
					onChange={(opacity): void => onChange({ ...value, opacity })}
				/>
			</ConfigField>
		</>
	);
}

export default PointsFields;
