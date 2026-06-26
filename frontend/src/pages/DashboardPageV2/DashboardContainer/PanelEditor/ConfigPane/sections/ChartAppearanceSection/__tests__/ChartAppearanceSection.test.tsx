import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardtypesLineStyleDTO } from 'api/generated/services/sigNoz.schemas';

import ChartAppearanceSection from '../ChartAppearanceSection';

// Open the antd Select by clicking its selector, then pick the option by label. The
// line-style and fill-mode controls are ConfigSegmented (buttons), so this helper is
// only used for the line-interpolation ConfigSelect.
async function pickOption(triggerTestId: string, label: string): Promise<void> {
	const user = userEvent.setup();
	const trigger = screen.getByTestId(triggerTestId);
	await user.click(trigger.querySelector('.ant-select-selector') as HTMLElement);
	await user.click(await screen.findByRole('option', { name: label }));
}

const ALL_CONTROLS = {
	lineStyle: true,
	lineInterpolation: true,
	fillMode: true,
	showPoints: true,
	spanGaps: true,
};

describe('ChartAppearanceSection', () => {
	it('renders every control that is enabled', () => {
		render(
			<ChartAppearanceSection
				value={undefined}
				controls={ALL_CONTROLS}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-line-style')).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-line-interpolation'),
		).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-fill-mode')).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-show-points')).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-span-gaps')).toBeInTheDocument();
	});

	it('renders only the controls whose flag is set', () => {
		render(
			<ChartAppearanceSection
				value={undefined}
				controls={{ lineStyle: true, fillMode: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-line-style')).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-fill-mode')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-line-interpolation'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-show-points'),
		).not.toBeInTheDocument();
	});

	it('writes the chosen fill mode through the segmented control', () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ lineStyle: DashboardtypesLineStyleDTO.solid }}
				controls={{ fillMode: true }}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByText('Gradient'));

		expect(onChange).toHaveBeenCalledWith({
			lineStyle: 'solid',
			fillMode: 'gradient',
		});
	});

	it('writes the chosen line interpolation through the dropdown', async () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={undefined}
				controls={{ lineInterpolation: true }}
				onChange={onChange}
			/>,
		);

		await pickOption('panel-editor-v2-line-interpolation', 'Spline');

		expect(onChange).toHaveBeenCalledWith({ lineInterpolation: 'spline' });
	});

	it('toggles show points through onChange', () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ showPoints: false }}
				controls={{ showPoints: true }}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByTestId('panel-editor-v2-show-points'));

		expect(onChange).toHaveBeenCalledWith({ showPoints: true });
	});

	it('defaults to "Never" (no threshold) and hides the threshold input', () => {
		render(
			<ChartAppearanceSection
				value={undefined}
				controls={{ spanGaps: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByText('Never')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-span-gaps-value'),
		).not.toBeInTheDocument();
	});

	it('switching to "Threshold" seeds the default 1m threshold', () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={undefined}
				controls={{ spanGaps: true }}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByText('Threshold'));

		expect(onChange).toHaveBeenLastCalledWith({
			spanGaps: { fillLessThan: '1m' },
		});
	});

	it('stores the threshold as a duration string (not seconds)', () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ spanGaps: { fillLessThan: '1m' } }}
				controls={{ spanGaps: true }}
				onChange={onChange}
			/>,
		);

		const input = screen.getByTestId('panel-editor-v2-span-gaps-value');
		expect(input).toHaveValue('1m');

		fireEvent.change(input, { target: { value: '5m' } });
		fireEvent.blur(input);

		expect(onChange).toHaveBeenLastCalledWith({
			spanGaps: { fillLessThan: '5m' },
		});
	});

	it('stores the entry verbatim (bare number kept as typed, not converted)', () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ spanGaps: { fillLessThan: '1m' } }}
				controls={{ spanGaps: true }}
				onChange={onChange}
			/>,
		);

		const input = screen.getByTestId('panel-editor-v2-span-gaps-value');
		fireEvent.change(input, { target: { value: '300' } });
		fireEvent.blur(input);

		expect(onChange).toHaveBeenLastCalledWith({
			spanGaps: { fillLessThan: '300' },
		});
	});

	it('switching back to "Never" clears the threshold', () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ spanGaps: { fillLessThan: '1m' } }}
				controls={{ spanGaps: true }}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByText('Never'));

		expect(onChange).toHaveBeenLastCalledWith({ spanGaps: undefined });
	});

	it('shows an error and does not commit an invalid duration', () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ spanGaps: { fillLessThan: '1m' } }}
				controls={{ spanGaps: true }}
				onChange={onChange}
			/>,
		);

		const input = screen.getByTestId('panel-editor-v2-span-gaps-value');
		fireEvent.change(input, { target: { value: 'abc' } });
		fireEvent.blur(input);

		expect(screen.getByText(/valid duration/i)).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('rejects a threshold below the query step interval', () => {
		const onChange = jest.fn();
		render(
			<ChartAppearanceSection
				value={{ spanGaps: { fillLessThan: '2m' } }}
				controls={{ spanGaps: true }}
				stepInterval={120}
				onChange={onChange}
			/>,
		);

		const input = screen.getByTestId('panel-editor-v2-span-gaps-value');
		// 1m (60s) is below the 2m (120s) step interval.
		fireEvent.change(input, { target: { value: '1m' } });
		fireEvent.blur(input);

		expect(screen.getByText(/Threshold should be >/)).toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});
});
