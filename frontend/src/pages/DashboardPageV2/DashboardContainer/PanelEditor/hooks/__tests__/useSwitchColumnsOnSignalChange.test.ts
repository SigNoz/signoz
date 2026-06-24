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
import { useSwitchColumnsOnSignalChange } from '../useSwitchColumnsOnSignalChange';

// The hook applies the datasource defaults reduced to the field-key DTO (the V1
// constants carry extra keys like `isIndexed`); assertions mirror that.
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

type Props = {
	enabled: boolean;
	signal: TelemetrytypesSignalDTO | undefined;
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
};

function renderWith(initial: Props): { rerender: (next: Props) => void } {
	const { rerender } = renderHook(
		(props: Props) => useSwitchColumnsOnSignalChange(props),
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

	it('does not switch on a transient undefined signal', () => {
		const onChangeSpec = jest.fn();
		const spec = makeSpec([{ name: 'body' }]);
		const { rerender } = renderWith({
			enabled: true,
			signal: TelemetrytypesSignalDTO.logs,
			spec,
			onChangeSpec,
		});

		rerender({ enabled: true, signal: undefined, spec, onChangeSpec });
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
