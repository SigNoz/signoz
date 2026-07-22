import { render, screen, userEvent } from 'tests/test-utils';

import AxesSection from '../AxesSection';

describe('AxesSection', () => {
	it('renders soft bounds and the log-scale switch when both controls are enabled', () => {
		render(
			<AxesSection
				value={undefined}
				controls={{ minMax: true, logScale: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-soft-min')).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-soft-max')).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-log-scale')).toBeInTheDocument();
	});

	it('hides the soft bounds when minMax is off', () => {
		render(
			<AxesSection
				value={undefined}
				controls={{ logScale: true }}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-soft-min'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-log-scale')).toBeInTheDocument();
	});

	it('writes a numeric soft min through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<AxesSection
				value={undefined}
				controls={{ minMax: true }}
				onChange={onChange}
			/>,
		);

		await user.type(screen.getByTestId('panel-editor-v2-soft-min'), '5');

		expect(onChange).toHaveBeenCalledWith({ softMin: 5 });
	});

	it('clears a soft bound to null when the field is emptied', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<AxesSection
				value={{ softMax: 100 }}
				controls={{ minMax: true }}
				onChange={onChange}
			/>,
		);

		await user.clear(screen.getByTestId('panel-editor-v2-soft-max'));

		expect(onChange).toHaveBeenCalledWith({ softMax: null });
	});

	it('toggles the logarithmic scale through onChange', async () => {
		const user = userEvent.setup();
		const onChange = jest.fn();
		render(
			<AxesSection
				value={{ isLogScale: false }}
				controls={{ logScale: true }}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByText('Log'));

		expect(onChange).toHaveBeenCalledWith({ isLogScale: true });
	});
});
