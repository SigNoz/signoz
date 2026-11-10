import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardtypesPrecisionOptionDTO } from 'api/generated/services/sigNoz.schemas';

import FormattingSection from '../FormattingSection';

// Auto-seeding is covered by useSeedMetricUnit's tests; here `metricUnit` is just a prop.

async function pickDecimal(value: string): Promise<void> {
	await userEvent
		.setup()
		.click(screen.getByTestId(`panel-editor-v2-decimals-${value}`));
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

		await pickDecimal('full');

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

		await pickDecimal('3');

		expect(onChange).toHaveBeenCalledWith({
			unit: 'bytes',
			decimalPrecision: '3',
		});
	});

	it('previews a sample value at the chosen precision', () => {
		render(
			<FormattingSection
				value={{ decimalPrecision: DashboardtypesPrecisionOptionDTO.NUMBER_1 }}
				controls={{ decimals: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('decimals-preview')).toHaveTextContent('1,234.5');
	});

	it('reverts a changed precision to its saved value', async () => {
		const onChange = jest.fn();
		render(
			<FormattingSection
				value={{
					unit: 'bytes',
					decimalPrecision: DashboardtypesPrecisionOptionDTO.NUMBER_4,
				}}
				savedValue={{ unit: 'bytes' }}
				controls={{ decimals: true }}
				onChange={onChange}
			/>,
		);

		await userEvent.setup().click(screen.getByTestId('config-field-reset'));

		expect(onChange).toHaveBeenCalledWith({
			unit: 'bytes',
			decimalPrecision: undefined,
		});
	});

	it('offers no reset for a unit that matches the saved one', () => {
		render(
			<FormattingSection
				value={{ unit: 'ms' }}
				savedValue={{ unit: 'ms' }}
				controls={{ unit: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.queryByTestId('config-field-reset')).not.toBeInTheDocument();
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
				tableColumns={[{ key: 'A', label: 'A', name: 'A' }]}
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
				tableColumns={[{ key: 'A', label: 'A', name: 'A' }]}
				metricUnit="s"
				onChange={jest.fn()}
			/>,
		);

		expect(screen.queryByLabelText('warning')).not.toBeInTheDocument();
	});
});
