import { useState } from 'react';
import {
	DashboardtypesComparisonOperatorDTO,
	type DashboardtypesComparisonThresholdDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { AnyThreshold } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';
import { render, screen, userEvent } from 'tests/test-utils';

import UnifiedThresholdsSection from '../ThresholdsSection';

// The comparison editor is the unified ThresholdsSection in its `comparison` variant;
// this wrapper pins the variant so the suite reads as the comparison editor's spec.
function ComparisonThresholdsSection(props: {
	value: DashboardtypesComparisonThresholdDTO[] | undefined;
	onChange: (next: DashboardtypesComparisonThresholdDTO[]) => void;
	yAxisUnit?: string;
}): JSX.Element {
	return (
		<UnifiedThresholdsSection
			value={props.value}
			onChange={props.onChange as (next: AnyThreshold[]) => void}
			yAxisUnit={props.yAxisUnit}
			controls={{ variant: 'comparison' }}
		/>
	);
}

const THRESHOLDS: DashboardtypesComparisonThresholdDTO[] = [
	{
		value: 80,
		color: '#F5B225',
		operator: DashboardtypesComparisonOperatorDTO.above,
		unit: 'percent',
		format: DashboardtypesThresholdFormatDTO.background,
	},
];

// Stateful harness for flows that depend on the value updating (add/discard).
function Harness({ yAxisUnit }: { yAxisUnit?: string }): JSX.Element {
	const [value, setValue] = useState<DashboardtypesComparisonThresholdDTO[]>([]);
	return (
		<ComparisonThresholdsSection
			value={value}
			onChange={setValue}
			yAxisUnit={yAxisUnit}
		/>
	);
}

describe('ComparisonThresholdsSection', () => {
	it('renders only the add button when there are no thresholds', () => {
		render(
			<ComparisonThresholdsSection value={undefined} onChange={jest.fn()} />,
		);

		expect(
			screen.getByTestId('panel-editor-v2-add-comparison-threshold'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('comparison-threshold-edit-0'),
		).not.toBeInTheDocument();
	});

	it('shows an existing threshold in view mode (no form until Edit)', () => {
		render(
			<ComparisonThresholdsSection value={THRESHOLDS} onChange={jest.fn()} />,
		);

		expect(screen.getByTestId('comparison-threshold-edit-0')).toBeInTheDocument();
		// Operator symbol + value render in the summary.
		expect(screen.getByText(/> 80/)).toBeInTheDocument();
		// The editable fields are hidden until the row is edited.
		expect(
			screen.queryByTestId('comparison-threshold-value-0'),
		).not.toBeInTheDocument();
	});

	it('formats the view-mode value through its unit (e.g. currency symbol)', () => {
		render(
			<ComparisonThresholdsSection
				value={[
					{
						value: 3100,
						color: '#F5B225',
						operator: DashboardtypesComparisonOperatorDTO.below,
						unit: 'currencyUSD',
					},
				]}
				onChange={jest.fn()}
			/>,
		);

		const row = screen.getByTestId('comparison-threshold-edit-0').closest('div');
		// Unit-aware: shows the currency symbol, never the raw unit id.
		expect(row).toHaveTextContent('$');
		expect(row).not.toHaveTextContent('currencyUSD');
	});

	it('edits a threshold value and commits it on Save', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ComparisonThresholdsSection value={THRESHOLDS} onChange={onChange} />,
		);

		await user.click(screen.getByTestId('comparison-threshold-edit-0'));
		const valueInput = screen.getByTestId('comparison-threshold-value-0');
		expect(valueInput).toHaveValue(80);

		await user.clear(valueInput);
		await user.type(valueInput, '90');
		await user.click(screen.getByTestId('comparison-threshold-save-0'));

		expect(onChange).toHaveBeenCalledWith([
			{
				value: 90,
				color: '#F5B225',
				operator: DashboardtypesComparisonOperatorDTO.above,
				unit: 'percent',
				format: DashboardtypesThresholdFormatDTO.background,
			},
		]);
	});

	it('does not commit edits when Discard is clicked', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ComparisonThresholdsSection value={THRESHOLDS} onChange={onChange} />,
		);

		await user.click(screen.getByTestId('comparison-threshold-edit-0'));
		await user.clear(screen.getByTestId('comparison-threshold-value-0'));
		await user.type(screen.getByTestId('comparison-threshold-value-0'), '90');
		await user.click(screen.getByTestId('comparison-threshold-discard-0'));

		expect(onChange).not.toHaveBeenCalled();
		// Back to view mode.
		expect(
			screen.queryByTestId('comparison-threshold-value-0'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('comparison-threshold-edit-0')).toBeInTheDocument();
	});

	it('removes a threshold from view mode', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<ComparisonThresholdsSection value={THRESHOLDS} onChange={onChange} />,
		);

		await user.click(screen.getByTestId('comparison-threshold-remove-0'));

		expect(onChange).toHaveBeenCalledWith([]);
	});

	it('adds a threshold that opens in edit mode, and discards it away', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.click(
			screen.getByTestId('panel-editor-v2-add-comparison-threshold'),
		);
		// New row opens in edit mode.
		expect(
			screen.getByTestId('comparison-threshold-value-0'),
		).toBeInTheDocument();

		await user.click(screen.getByTestId('comparison-threshold-discard-0'));
		// Discarding a never-saved row removes it entirely.
		expect(
			screen.queryByTestId('comparison-threshold-value-0'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('comparison-threshold-edit-0'),
		).not.toBeInTheDocument();
	});

	it('flags a threshold unit in a different category than the y-axis unit', async () => {
		const user = userEvent.setup();
		render(
			<ComparisonThresholdsSection
				value={[
					{
						value: 80,
						color: '#F5B225',
						operator: DashboardtypesComparisonOperatorDTO.above,
						unit: 'ms',
					},
				]}
				yAxisUnit="bytes"
				onChange={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('comparison-threshold-edit-0'));
		expect(
			screen.getByTestId('comparison-threshold-unit-invalid-0'),
		).toBeInTheDocument();
	});
});
