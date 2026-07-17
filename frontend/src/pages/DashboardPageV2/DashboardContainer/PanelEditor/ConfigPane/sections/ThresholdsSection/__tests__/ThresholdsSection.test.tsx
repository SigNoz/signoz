import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas';
import type { AnyThreshold } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ThresholdsSection from '../ThresholdsSection';

const THRESHOLDS: DashboardtypesThresholdWithLabelDTO[] = [
	{ value: 80, color: '#F5B225', label: 'High', unit: 'percent' },
];

// Stateful harness for flows that depend on the value updating (add/discard/live);
// omits `controls` to exercise the default `label` variant.
function Harness({
	yAxisUnit,
	initial = [],
}: {
	yAxisUnit?: string;
	initial?: AnyThreshold[];
}): JSX.Element {
	const [value, setValue] = useState<AnyThreshold[]>(initial);
	return (
		<ThresholdsSection value={value} onChange={setValue} yAxisUnit={yAxisUnit} />
	);
}

describe('ThresholdsSection', () => {
	it('renders only the add button when there are no thresholds', () => {
		render(<ThresholdsSection value={undefined} onChange={jest.fn()} />);

		expect(
			screen.getByTestId('panel-editor-v2-add-threshold'),
		).toBeInTheDocument();
		expect(screen.queryByTestId('threshold-edit-0')).not.toBeInTheDocument();
	});

	it('shows an existing threshold in view mode (no form until Edit)', () => {
		render(<ThresholdsSection value={THRESHOLDS} onChange={jest.fn()} />);

		expect(screen.getByTestId('threshold-edit-0')).toBeInTheDocument();
		expect(screen.getByText('High')).toBeInTheDocument();
		expect(screen.queryByTestId('threshold-value-0')).not.toBeInTheDocument();
	});

	it('edits a threshold value and commits it on Save', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<ThresholdsSection value={THRESHOLDS} onChange={onChange} />);

		await user.click(screen.getByTestId('threshold-edit-0'));
		const valueInput = screen.getByTestId('threshold-value-0');
		expect(valueInput).toHaveValue(80);

		await user.clear(valueInput);
		await user.type(valueInput, '90');
		await user.click(screen.getByTestId('threshold-save-0'));

		expect(onChange).toHaveBeenLastCalledWith([
			{ value: 90, color: '#F5B225', label: 'High', unit: 'percent' },
		]);
	});

	it('persists an empty-string label when none is provided', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		// Label absent (e.g. a pre-existing spec); spec requires a string, so save
		// must send '' not undefined.
		const noLabel = [{ value: 50, color: '#F1575F' }] as AnyThreshold[];
		render(<ThresholdsSection value={noLabel} onChange={onChange} />);

		await user.click(screen.getByTestId('threshold-edit-0'));
		await user.click(screen.getByTestId('threshold-save-0'));

		expect(onChange).toHaveBeenCalledWith([
			{ value: 50, color: '#F1575F', label: '' },
		]);
	});

	it('reflects edits live (before Save) so the preview can react', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<ThresholdsSection value={THRESHOLDS} onChange={onChange} />);

		await user.click(screen.getByTestId('threshold-edit-0'));
		await user.clear(screen.getByTestId('threshold-value-0'));
		await user.type(screen.getByTestId('threshold-value-0'), '90');

		// No Save click — the edit is pushed up (debounced) for the preview to render.
		await waitFor(() =>
			expect(onChange).toHaveBeenLastCalledWith([
				{ value: 90, color: '#F5B225', label: 'High', unit: 'percent' },
			]),
		);
	});

	it('reverts the live edits to the saved value on Discard', async () => {
		const user = userEvent.setup();
		render(<Harness initial={THRESHOLDS} />);

		await user.click(screen.getByTestId('threshold-edit-0'));
		await user.clear(screen.getByTestId('threshold-value-0'));
		await user.type(screen.getByTestId('threshold-value-0'), '90');
		await user.click(screen.getByTestId('threshold-discard-0'));

		// Back to view mode, and re-opening shows the rolled-back 80, not 90.
		expect(screen.queryByTestId('threshold-value-0')).not.toBeInTheDocument();
		await user.click(screen.getByTestId('threshold-edit-0'));
		expect(screen.getByTestId('threshold-value-0')).toHaveValue(80);
	});

	it('removes a threshold from view mode', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(<ThresholdsSection value={THRESHOLDS} onChange={onChange} />);

		await user.click(screen.getByTestId('threshold-remove-0'));

		expect(onChange).toHaveBeenCalledWith([]);
	});

	it('adds a threshold that opens in edit mode, and discards it away', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.click(screen.getByTestId('panel-editor-v2-add-threshold'));
		expect(screen.getByTestId('threshold-value-0')).toBeInTheDocument();

		// Discarding a never-saved row removes it entirely.
		await user.click(screen.getByTestId('threshold-discard-0'));
		expect(screen.queryByTestId('threshold-value-0')).not.toBeInTheDocument();
		expect(screen.queryByTestId('threshold-edit-0')).not.toBeInTheDocument();
	});

	it('flags a threshold unit in a different category than the y-axis unit', async () => {
		const user = userEvent.setup();
		render(
			<ThresholdsSection
				value={[{ value: 80, color: '#F5B225', label: '', unit: 'ms' }]}
				yAxisUnit="bytes"
				onChange={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('threshold-edit-0'));
		expect(screen.getByTestId('threshold-unit-invalid-0')).toBeInTheDocument();
	});

	it('does not flag a threshold unit in the same category as the y-axis unit', async () => {
		const user = userEvent.setup();
		render(
			<ThresholdsSection
				value={[{ value: 80, color: '#F5B225', label: '', unit: 'ms' }]}
				yAxisUnit="s"
				onChange={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('threshold-edit-0'));
		expect(
			screen.queryByTestId('threshold-unit-invalid-0'),
		).not.toBeInTheDocument();
	});
});
