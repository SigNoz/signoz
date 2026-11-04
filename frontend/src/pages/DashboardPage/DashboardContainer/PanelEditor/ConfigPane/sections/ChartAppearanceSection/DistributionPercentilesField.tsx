import type { DashboardtypesDistributionPercentilesDTO } from 'api/generated/services/sigNoz.schemas';
import { DEFAULT_DISTRIBUTION_PERCENTILES } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/resolvers';

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
	savedValue?: DashboardtypesDistributionPercentilesDTO;
	onChange: (next: DashboardtypesDistributionPercentilesDTO) => void;
}

/** Edits `chartAppearance.percentiles`; unset reads as on, at p50/p90/p99. */
function DistributionPercentilesField({
	value,
	savedValue,
	onChange,
}: DistributionPercentilesFieldProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const enabled = value?.enabled ?? true;
	const values = value?.values ?? DEFAULT_DISTRIBUTION_PERCENTILES;

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
					help={`Up to ${MAX_PERCENTILE_MARKERS}.`}
					{...reset('values')}
				>
					<ConfigMultiSelect
						testId="panel-editor-v2-percentile-values"
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
