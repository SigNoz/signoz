import { DashboardtypesLegendOrderDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import LegendColors from '../../controls/LegendColors/LegendColors';
import LegendOrder from '../../controls/LegendOrder/LegendOrder';
import type { SectionEditorContext } from '../../sectionContext';
import { createFieldResetter } from '../../utils/changes';
import { ORDER_OPTIONS, POSITION_OPTIONS } from './options';

type LegendSectionProps = SectionEditorProps<SectionKind.Legend> &
	Pick<SectionEditorContext, 'legendSeries'>;

/**
 * Edits the `legend` slice of a panel spec: legend position, per-series color
 * overrides and series order. The colors and order controls read the panel's resolved
 * series from context (the shared preview query) and write `customColors` and
 * `customOrder` keyed by series label.
 */
function LegendSection({
	value,
	defaultValue,
	savedValue,
	controls,
	onChange,
	legendSeries,
}: LegendSectionProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const order =
		value?.order ?? defaultValue?.order ?? DashboardtypesLegendOrderDTO.value;

	return (
		<>
			{controls.position && (
				<ConfigField label="Position" {...reset('position')}>
					<ConfigTiles
						testId="panel-editor-v2-legend-position"
						aria-label="Legend position"
						items={POSITION_OPTIONS}
						value={value?.position ?? defaultValue?.position}
						onChange={(position): void => onChange({ ...value, position })}
					/>
				</ConfigField>
			)}

			{controls.colors && (
				<ConfigField label="Series colors" {...reset('customColors')}>
					<LegendColors
						series={legendSeries ?? []}
						value={value?.customColors}
						onChange={(customColors): void => onChange({ ...value, customColors })}
					/>
				</ConfigField>
			)}

			{controls.order && (
				<ConfigField
					label="Series order"
					help={
						order === DashboardtypesLegendOrderDTO.custom
							? 'Lower indexes come first; series with the same index sort by label.'
							: undefined
					}
					{...reset('order', 'customOrder')}
				>
					<ConfigTiles
						testId="panel-editor-v2-legend-order-mode"
						aria-label="Legend order"
						compact
						items={ORDER_OPTIONS}
						value={order}
						onChange={(next): void => onChange({ ...value, order: next })}
					/>
					{order === DashboardtypesLegendOrderDTO.custom && (
						<LegendOrder
							series={legendSeries ?? []}
							value={value?.customOrder}
							onChange={(customOrder): void => onChange({ ...value, customOrder })}
						/>
					)}
				</ConfigField>
			)}
		</>
	);
}

export default LegendSection;
