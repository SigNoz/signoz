import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas';
import type { AnyThreshold } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ThresholdsSection from '../ThresholdsSection';

const THRESHOLDS: DashboardtypesThresholdWithLabelDTO[] = [
	{ value: 80, color: '#F5B225', label: 'High', unit: 'percent' },
];

// Stateful harness for flows that depend on the value updating (add/discard). No
// `controls` is passed, exercising the default `label` variant.
function Harness({ yAxisUnit }: { yAxisUnit?: string }): JSX.Element {
	const [value, setValue] = useState<AnyThreshold[]>([]);
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
		// The editable fields are hidden until the row is edited.
		expect(screen.queryByTestId('threshold-value-0')).not.toBeInTheDocument();
	});

	it('edits a threshold value and commits it on Save', () => {
		const onChange = jest.fn();
		render(<ThresholdsSection value={THRESHOLDS} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('threshold-edit-0'));
		expect(screen.getByTestId('threshold-value-0')).toHaveValue(80);

		fireEvent.change(screen.getByTestId('threshold-value-0'), {
			target: { value: '90' },
		});
		fireEvent.click(screen.getByTestId('threshold-save-0'));

		expect(onChange).toHaveBeenCalledWith([
			{ value: 90, color: '#F5B225', label: 'High', unit: 'percent' },
		]);
	});

	it('does not commit edits when Discard is clicked', () => {
		const onChange = jest.fn();
		render(<ThresholdsSection value={THRESHOLDS} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('threshold-edit-0'));
		fireEvent.change(screen.getByTestId('threshold-value-0'), {
			target: { value: '90' },
		});
		fireEvent.click(screen.getByTestId('threshold-discard-0'));

		expect(onChange).not.toHaveBeenCalled();
		// Back to view mode.
		expect(screen.queryByTestId('threshold-value-0')).not.toBeInTheDocument();
		expect(screen.getByTestId('threshold-edit-0')).toBeInTheDocument();
	});

	it('removes a threshold from view mode', () => {
		const onChange = jest.fn();
		render(<ThresholdsSection value={THRESHOLDS} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('threshold-remove-0'));

		expect(onChange).toHaveBeenCalledWith([]);
	});

	it('adds a threshold that opens in edit mode, and discards it away', () => {
		render(<Harness />);

		fireEvent.click(screen.getByTestId('panel-editor-v2-add-threshold'));
		// New row opens in edit mode.
		expect(screen.getByTestId('threshold-value-0')).toBeInTheDocument();

		fireEvent.click(screen.getByTestId('threshold-discard-0'));
		// Discarding a never-saved row removes it entirely.
		expect(screen.queryByTestId('threshold-value-0')).not.toBeInTheDocument();
		expect(screen.queryByTestId('threshold-edit-0')).not.toBeInTheDocument();
	});

	it('flags a threshold unit in a different category than the y-axis unit', () => {
		render(
			<ThresholdsSection
				value={[{ value: 80, color: '#F5B225', label: '', unit: 'ms' }]}
				yAxisUnit="bytes"
				onChange={jest.fn()}
			/>,
		);

		fireEvent.click(screen.getByTestId('threshold-edit-0'));
		expect(screen.getByTestId('threshold-unit-invalid-0')).toBeInTheDocument();
	});

	it('does not flag a threshold unit in the same category as the y-axis unit', () => {
		render(
			<ThresholdsSection
				value={[{ value: 80, color: '#F5B225', label: '', unit: 'ms' }]}
				yAxisUnit="s"
				onChange={jest.fn()}
			/>,
		);

		fireEvent.click(screen.getByTestId('threshold-edit-0'));
		expect(
			screen.queryByTestId('threshold-unit-invalid-0'),
		).not.toBeInTheDocument();
	});
});
