import { useEffect, useState } from 'react';
import type { DashboardtypesSpanGapsDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import type { FieldResetProps } from '../../utils/changes';
import DisconnectValuesThresholdInput from './DisconnectValuesThresholdInput';
import { DISCONNECT_MODE_OPTIONS, DisconnectValuesMode } from './options';
import { defaultDisconnectDuration } from './utils';

import styles from './ChartAppearanceSection.module.scss';

interface DisconnectValuesFieldProps extends FieldResetProps {
	testId: string;
	value: DashboardtypesSpanGapsDTO | undefined;
	/** Query step interval (seconds): seeds the default threshold and floors it. */
	stepInterval?: number;
	onChange: (next: DashboardtypesSpanGapsDTO | undefined) => void;
}

/**
 * "Disconnect values": Never (span every gap — the chart default) vs Threshold
 * (only bridge gaps shorter than a duration). The threshold persists as a
 * duration string in `spanGaps.fillLessThan` ("10m", "5s") — the wire format the
 * backend expects.
 */
function DisconnectValuesField({
	testId,
	value,
	stepInterval,
	changed,
	onReset,
	onChange,
}: DisconnectValuesFieldProps): JSX.Element {
	const duration = value?.fillLessThan || undefined;
	// `fillOnlyBelow` is authoritative; fall back to a stored duration for legacy panels.
	const isThreshold = value?.fillOnlyBelow ?? !!duration;
	// Remember the last committed threshold so Never → Threshold restores it.
	const [lastDuration, setLastDuration] = useState<string | undefined>(duration);

	useEffect(() => {
		if (duration) {
			setLastDuration(duration);
		}
	}, [duration]);

	const handleMode = (mode: DisconnectValuesMode): void => {
		if (mode === DisconnectValuesMode.THRESHOLD) {
			onChange({
				...value,
				fillOnlyBelow: true,
				// Seed from the live stepInterval (async — undefined until results load), not mount.
				fillLessThan: lastDuration ?? defaultDisconnectDuration(stepInterval),
			});
			return;
		}
		// Never spans every gap; drop the duration so the renderer reads a clean "span all".
		onChange({ ...value, fillOnlyBelow: false, fillLessThan: undefined });
	};

	return (
		<ConfigField
			label="When data is missing"
			help="Breaking the line makes outages and restarts visible."
			changed={changed}
			onReset={onReset}
		>
			<ConfigTiles
				testId={testId}
				aria-label="When data is missing"
				value={
					isThreshold ? DisconnectValuesMode.THRESHOLD : DisconnectValuesMode.NEVER
				}
				items={DISCONNECT_MODE_OPTIONS}
				onChange={handleMode}
			/>
			{isThreshold && duration && (
				<div className={styles.inset}>
					<span className={styles.insetLabel}>Break when a gap is longer than</span>
					<DisconnectValuesThresholdInput
						testId={`${testId}-value`}
						value={duration}
						minValue={stepInterval}
						onChange={(next): void =>
							onChange({ ...value, fillOnlyBelow: true, fillLessThan: next })
						}
					/>
				</div>
			)}
		</ConfigField>
	);
}

export default DisconnectValuesField;
