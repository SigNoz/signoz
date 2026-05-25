import { useCallback, useMemo } from 'react';
import DynamicVariable from 'container/DashboardContainer/DashboardSettings/DashboardVariableSettings/VariableItem/DynamicVariable/DynamicVariable';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

interface Props {
	dynamicName: string;
	dynamicSignal: TelemetrytypesSignalDTO | undefined;
	onNameChange: (v: string) => void;
	onSignalChange: (v: TelemetrytypesSignalDTO | undefined) => void;
	error?: string;
}

// V1 DynamicVariable stores the source as a UI-friendly label:
// 'All telemetry' | 'Logs' | 'Metrics' | 'Traces'. V2 stores the API enum
// signal value: undefined (= all) | 'metrics' | 'traces' | 'logs'. We convert
// at this boundary so the V1 component can stay untouched.
const ALL_TELEMETRY = 'All telemetry';

function signalToV1Source(
	signal: TelemetrytypesSignalDTO | undefined,
): string {
	if (signal === TelemetrytypesSignalDTO.logs) return 'Logs';
	if (signal === TelemetrytypesSignalDTO.metrics) return 'Metrics';
	if (signal === TelemetrytypesSignalDTO.traces) return 'Traces';
	return ALL_TELEMETRY;
}

function v1SourceToSignal(
	source: string,
): TelemetrytypesSignalDTO | undefined {
	if (source === 'Logs') return TelemetrytypesSignalDTO.logs;
	if (source === 'Metrics') return TelemetrytypesSignalDTO.metrics;
	if (source === 'Traces') return TelemetrytypesSignalDTO.traces;
	return undefined;
}

function DynamicFields({
	dynamicName,
	dynamicSignal,
	onNameChange,
	onSignalChange,
	error,
}: Props): JSX.Element {
	const v1Value = useMemo(
		() => ({ name: dynamicName, value: signalToV1Source(dynamicSignal) }),
		[dynamicName, dynamicSignal],
	);

	const setV1Value: React.Dispatch<
		React.SetStateAction<{ name: string; value: string } | undefined>
	> = useCallback(
		(action) => {
			const next =
				typeof action === 'function' ? action(v1Value) : action;
			if (!next) return;
			if (next.name !== dynamicName) onNameChange(next.name);
			const nextSignal = v1SourceToSignal(next.value);
			if (nextSignal !== dynamicSignal) onSignalChange(nextSignal);
		},
		[v1Value, dynamicName, dynamicSignal, onNameChange, onSignalChange],
	);

	return (
		<div className="variable-dynamic-section">
			<DynamicVariable
				setDynamicVariablesSelectedValue={setV1Value}
				dynamicVariablesSelectedValue={v1Value}
				errorAttributeKeyMessage={error}
			/>
		</div>
	);
}

export default DynamicFields;
