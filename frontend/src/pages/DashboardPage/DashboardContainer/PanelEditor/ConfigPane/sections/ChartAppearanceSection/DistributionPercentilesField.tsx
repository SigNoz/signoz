import { isEqual } from 'lodash-es';
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

/** Unset reads as on, at p50/p90/p99. */
function resolvePercentiles(
	percentiles: DashboardtypesDistributionPercentilesDTO | undefined,
): { enabled: boolean; values: number[] } {
	return {
		enabled: percentiles?.enabled ?? true,
		values: percentiles?.values ?? DEFAULT_DISTRIBUTION_PERCENTILES,
	};
}

/** Edits `chartAppearance.percentiles`. */
function DistributionPercentilesField({
	value,
	savedValue,
	onChange,
}: DistributionPercentilesFieldProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const { enabled, values } = resolvePercentiles(value);
	const saved = resolvePercentiles(savedValue);

	return (
		<>
			<ConfigSwitch
				testId="panel-editor-v2-percentile-markers"
				title="Percentile markers"
				description="Dashed lines at percentiles estimated from the bucket counts."
				sketch={SWITCH_SKETCHES.percentiles}
				changed={enabled !== saved.enabled}
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
					onReset={reset('values').onReset}
					changed={!isEqual(values, saved.values)}
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
