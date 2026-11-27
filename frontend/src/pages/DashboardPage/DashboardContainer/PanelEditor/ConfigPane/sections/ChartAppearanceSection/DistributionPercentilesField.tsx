import type { DashboardtypesDistributionPercentilesDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigMultiSelect from '../../controls/ConfigMultiSelect/ConfigMultiSelect';
import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';
import { SWITCH_SKETCHES } from '../../controls/drawings/switchSketches';
import { createFieldResetter } from '../../utils/changes';
import {
	MAX_PERCENTILE_MARKERS,
	resolvePercentileItems,
} from './percentileOptions';

interface DistributionPercentilesFieldProps {
	value: DashboardtypesDistributionPercentilesDTO | undefined;
	/** The new panel's seed: what the server writes for unset percentiles. */
	defaultValue?: DashboardtypesDistributionPercentilesDTO;
	savedValue?: DashboardtypesDistributionPercentilesDTO;
	onChange: (next: DashboardtypesDistributionPercentilesDTO) => void;
}

/** Edits `chartAppearance.percentiles`. */
function DistributionPercentilesField({
	value,
	defaultValue,
	savedValue,
	onChange,
}: DistributionPercentilesFieldProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const enabled = value?.enabled ?? defaultValue?.enabled ?? false;
	const values = value?.values ?? defaultValue?.values ?? [];

	return (
		<>
			<ConfigSwitch
				testId="panel-editor-v2-percentile-markers"
				title="Percentile markers"
				description="Dashed lines at percentiles estimated from the bucket counts."
				sketch={SWITCH_SKETCHES.percentiles}
				changed={reset('enabled').changed}
				value={enabled}
				onChange={(next): void => onChange({ enabled: next, values })}
			/>

			{enabled && (
				<ConfigField
					label="Percentiles"
					help={
						<span data-testid="panel-editor-v2-percentile-limit">
							{values.length >= MAX_PERCENTILE_MARKERS
								? `Limit of ${MAX_PERCENTILE_MARKERS} reached; remove one to pick another.`
								: `Up to ${MAX_PERCENTILE_MARKERS}.`}
						</span>
					}
					{...reset('values')}
				>
					<ConfigMultiSelect
						testId="panel-editor-v2-percentile-values"
						placeholder="Pick percentiles"
						value={values.map(String)}
						items={resolvePercentileItems(values)}
						onChange={(picked): void => {
							if (picked.length <= MAX_PERCENTILE_MARKERS) {
								onChange({ enabled, values: picked.map(Number) });
							}
						}}
					/>
				</ConfigField>
			)}
		</>
	);
}

export default DistributionPercentilesField;
