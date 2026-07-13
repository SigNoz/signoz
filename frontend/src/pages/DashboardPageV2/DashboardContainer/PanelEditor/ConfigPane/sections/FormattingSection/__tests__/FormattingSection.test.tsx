import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FormattingSection from '../FormattingSection';

// Auto-seeding is covered by useSeedMetricUnit's tests; here `metricUnit` is just a prop.

// Open the Decimals select (clicking its antd selector) and pick the option with the
// given visible label.
async function pickDecimal(label: string): Promise<void> {
	const user = userEvent.setup();
	const trigger = screen.getByTestId('panel-editor-v2-decimals');
	await user.click(trigger.querySelector('.ant-select-selector') as HTMLElement);
	await user.click(await screen.findByRole('option', { name: label }));
}

describe('FormattingSection', () => {
	it('renders Unit and Decimals when both controls are enabled', () => {
		render(
			<FormattingSection
				value={undefined}
				controls={{ unit: true, decimals: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-unit')).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-decimals')).toBeInTheDocument();
	});

	it('hides a control when its flag is off', () => {
		render(
			<FormattingSection
				value={undefined}
				controls={{ decimals: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.queryByTestId('panel-editor-v2-unit')).not.toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-decimals')).toBeInTheDocument();
	});

	it('writes the chosen decimal precision through onChange', async () => {
		const onChange = jest.fn();
		render(
			<FormattingSection
				value={undefined}
				controls={{ decimals: true }}
				onChange={onChange}
			/>,
		);

		await pickDecimal('Full');

		expect(onChange).toHaveBeenCalledWith({ decimalPrecision: 'full' });
	});

	it('merges the edit into the existing formatting slice', async () => {
		const onChange = jest.fn();
		render(
			<FormattingSection
				value={{ unit: 'bytes' }}
				controls={{ decimals: true }}
				onChange={onChange}
			/>,
		);

		await pickDecimal('2 decimals');

		expect(onChange).toHaveBeenCalledWith({
			unit: 'bytes',
			decimalPrecision: '2',
		});
	});

	it('warns when the selected unit mismatches the metric unit', () => {
		// metric sent in seconds, but bytes is selected.
		render(
			<FormattingSection
				value={{ unit: 'By' }}
				controls={{ unit: true }}
				metricUnit="s"
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByLabelText('warning')).toBeInTheDocument();
	});

	it('shows no warning when the selected unit matches the metric unit', () => {
		render(
			<FormattingSection
				value={{ unit: 's' }}
				controls={{ unit: true }}
				metricUnit="s"
				onChange={jest.fn()}
			/>,
		);

		expect(screen.queryByLabelText('warning')).not.toBeInTheDocument();
	});

	it('warns when a column unit mismatches the metric unit', () => {
		// metric sent in seconds, but the column is set to bytes.
		render(
			<FormattingSection
				value={{ columnUnits: { A: 'By' } }}
				controls={{ columnUnits: true }}
				tableColumns={[{ key: 'A', label: 'A' }]}
				metricUnit="s"
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByLabelText('warning')).toBeInTheDocument();
	});

	it('shows no warning when the column unit matches the metric unit', () => {
		render(
			<FormattingSection
				value={{ columnUnits: { A: 's' } }}
				controls={{ columnUnits: true }}
				tableColumns={[{ key: 'A', label: 'A' }]}
				metricUnit="s"
				onChange={jest.fn()}
			/>,
		);

		expect(screen.queryByLabelText('warning')).not.toBeInTheDocument();
	});
});
