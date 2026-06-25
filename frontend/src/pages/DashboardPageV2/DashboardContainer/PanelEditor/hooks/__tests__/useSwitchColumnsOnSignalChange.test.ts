import { renderHook } from '@testing-library/react';
import {
	type DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
} from 'container/OptionsMenu/constants';

import { sanitizeSelectFields } from '../../ListColumnsEditor/selectFields';
import {
	useSwitchColumnsOnSignalChange,
	type UseSwitchColumnsOnSignalChangeArgs,
} from '../useSwitchColumnsOnSignalChange';

// V1 constants carry extra keys (e.g. `isIndexed`); the hook reduces them to the
// field-key DTO, so assertions sanitize the same way.
const expectedLogs = sanitizeSelectFields(
	defaultLogsSelectedColumns as TelemetrytypesTelemetryFieldKeyDTO[],
);
const expectedTraces = sanitizeSelectFields(
	defaultTraceSelectedColumns as TelemetrytypesTelemetryFieldKeyDTO[],
);

function makeSpec(
	selectFields: { name: string }[],
): DashboardtypesPanelSpecDTO {
	return {
		plugin: { kind: 'signoz/ListPanel', spec: { selectFields } },
		queries: [],
	} as unknown as DashboardtypesPanelSpecDTO;
}

function renderWith(initial: UseSwitchColumnsOnSignalChangeArgs): {
	rerender: (next: UseSwitchColumnsOnSignalChangeArgs) => void;
} {
	const { rerender } = renderHook(
		(props: UseSwitchColumnsOnSignalChangeArgs) =>
			useSwitchColumnsOnSignalChange(props),
		{ initialProps: initial },
	);
	return { rerender };
}

function selectFieldsOf(spec: DashboardtypesPanelSpecDTO): unknown[] {
	return (spec.plugin.spec as { selectFields: unknown[] }).selectFields;
}

describe('useSwitchColumnsOnSignalChange', () => {
	it('switches to the trace defaults when going logs → traces', () => {
		const onChangeSpec = jest.fn();
		const spec = makeSpec([{ name: 'body' }]);
		const { rerender } = renderWith({
			enabled: true,
			signal: TelemetrytypesSignalDTO.logs,
			spec,
			onChangeSpec,
		});

		rerender({
			enabled: true,
			signal: TelemetrytypesSignalDTO.traces,
			spec,
			onChangeSpec,
		});

		expect(onChangeSpec).toHaveBeenCalledTimes(1);
		expect(selectFieldsOf(onChangeSpec.mock.calls[0][0])).toStrictEqual(
			expectedTraces,
		);
	});

	it('restores the original columns on logs → traces → logs', () => {
		// Customized logs selection, not the timestamp/body defaults.
		const original = [
			{ name: 'timestamp' },
			{ name: 'body' },
			{ name: 'response_status_code' },
			{ name: 'trace_id' },
		];
		// Mirror the real parent: persist the spec so the next switch stashes the
		// columns the previous one applied.
		let spec = makeSpec(original);
		const onChangeSpec = jest.fn((next: DashboardtypesPanelSpecDTO) => {
			spec = next;
		});
		const { rerender } = renderWith({
			enabled: true,
			signal: TelemetrytypesSignalDTO.logs,
			spec,
			onChangeSpec,
		});

		rerender({
			enabled: true,
			signal: TelemetrytypesSignalDTO.traces,
			spec,
			onChangeSpec,
		});
		expect(selectFieldsOf(spec)).toStrictEqual(expectedTraces);

		// Switching back restores the original columns, not the log defaults.
		rerender({
			enabled: true,
			signal: TelemetrytypesSignalDTO.logs,
			spec,
			onChangeSpec,
		});
		expect(selectFieldsOf(spec)).toStrictEqual(original);
	});

	it('switches to the log defaults when going traces → logs', () => {
		const onChangeSpec = jest.fn();
		const spec = makeSpec([{ name: 'service.name' }]);
		const { rerender } = renderWith({
			enabled: true,
			signal: TelemetrytypesSignalDTO.traces,
			spec,
			onChangeSpec,
		});

		rerender({
			enabled: true,
			signal: TelemetrytypesSignalDTO.logs,
			spec,
			onChangeSpec,
		});

		expect(selectFieldsOf(onChangeSpec.mock.calls[0][0])).toStrictEqual(
			expectedLogs,
		);
	});

	it('does nothing when the signal is unchanged', () => {
		const onChangeSpec = jest.fn();
		const spec = makeSpec([{ name: 'body' }]);
		const { rerender } = renderWith({
			enabled: true,
			signal: TelemetrytypesSignalDTO.logs,
			spec,
			onChangeSpec,
		});

		rerender({
			enabled: true,
			signal: TelemetrytypesSignalDTO.logs,
			spec,
			onChangeSpec,
		});
		expect(onChangeSpec).not.toHaveBeenCalled();
	});

	it('does nothing when disabled (non-List kinds)', () => {
		const onChangeSpec = jest.fn();
		const spec = makeSpec([{ name: 'body' }]);
		const { rerender } = renderWith({
			enabled: false,
			signal: TelemetrytypesSignalDTO.logs,
			spec,
			onChangeSpec,
		});

		rerender({
			enabled: false,
			signal: TelemetrytypesSignalDTO.traces,
			spec,
			onChangeSpec,
		});
		expect(onChangeSpec).not.toHaveBeenCalled();
	});
});
