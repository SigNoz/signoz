import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardtypesTimePreferenceDTO } from 'api/generated/services/sigNoz.schemas';

import VisualizationSection from '../VisualizationSection';

// The type switcher resolves each kind's supported signals + query types; stub it so
// the test doesn't pull the whole panel registry (renderers, chart libs).
jest.mock('pages/DashboardPageV2/DashboardContainer/Panels/registry', () => ({
	getPanelDefinition: jest.fn(() => ({
		supportedSignals: ['metrics', 'logs', 'traces'],
		supportedQueryTypes: ['builder', 'clickhouse_sql', 'promql'],
	})),
}));

// Open the antd Select by clicking its selector, then pick the option by label.
async function pickOption(triggerTestId: string, label: string): Promise<void> {
	const user = userEvent.setup();
	const trigger = screen.getByTestId(triggerTestId);
	await user.click(trigger.querySelector('.ant-select-selector') as HTMLElement);
	await user.click(await screen.findByRole('option', { name: label }));
}

describe('VisualizationSection', () => {
	it('renders every control that is enabled', () => {
		render(
			<VisualizationSection
				value={undefined}
				controls={{
					switchPanelKind: true,
					timePreference: true,
					stacking: true,
					fillSpans: true,
				}}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-time-preference'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-stacked-bar-chart'),
		).toBeInTheDocument();
		expect(screen.getByTestId('panel-editor-v2-fill-spans')).toBeInTheDocument();
	});

	it('renders only the controls whose flag is set', () => {
		render(
			<VisualizationSection
				value={undefined}
				controls={{
					switchPanelKind: true,
					timePreference: true,
				}}
				onChange={jest.fn()}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-time-preference'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-stacked-bar-chart'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-editor-v2-fill-spans'),
		).not.toBeInTheDocument();
	});

	it('writes the chosen time preference through the dropdown', async () => {
		const onChange = jest.fn();
		render(
			<VisualizationSection
				value={undefined}
				controls={{
					switchPanelKind: true,
					timePreference: true,
				}}
				onChange={onChange}
			/>,
		);

		await pickOption('panel-editor-v2-time-preference', 'Last 1 hr');

		expect(onChange).toHaveBeenCalledWith({ timePreference: 'last_1_hr' });
	});

	it('toggles bar stacking through onChange, preserving other fields', () => {
		const onChange = jest.fn();
		render(
			<VisualizationSection
				value={{
					timePreference: DashboardtypesTimePreferenceDTO.global_time,
					stackedBarChart: false,
				}}
				controls={{
					switchPanelKind: true,
					stacking: true,
				}}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByTestId('panel-editor-v2-stacked-bar-chart'));

		expect(onChange).toHaveBeenCalledWith({
			timePreference: 'global_time',
			stackedBarChart: true,
		});
	});

	it('toggles fill spans through onChange', () => {
		const onChange = jest.fn();
		render(
			<VisualizationSection
				value={{ fillSpans: false }}
				controls={{
					switchPanelKind: true,
					fillSpans: true,
				}}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByTestId('panel-editor-v2-fill-spans'));

		expect(onChange).toHaveBeenCalledWith({ fillSpans: true });
	});

	it('renders the type switcher and switches kind when switchPanelKind is set', async () => {
		const onChangePanelKind = jest.fn();
		render(
			<VisualizationSection
				value={undefined}
				controls={{ switchPanelKind: true }}
				onChange={jest.fn()}
				panelKind="signoz/TimeSeriesPanel"
				onChangePanelKind={onChangePanelKind}
			/>,
		);

		expect(
			screen.getByTestId('panel-editor-v2-type-switcher'),
		).toBeInTheDocument();

		await pickOption('panel-editor-v2-type-switcher', 'Table');
		expect(onChangePanelKind).toHaveBeenCalledWith('signoz/TablePanel');
	});

	it('hides the type switcher when switchPanelKind is not set', () => {
		render(
			<VisualizationSection
				value={undefined}
				controls={{
					switchPanelKind: false,
					timePreference: true,
				}}
				onChange={jest.fn()}
				panelKind="signoz/TimeSeriesPanel"
				onChangePanelKind={jest.fn()}
			/>,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-type-switcher'),
		).not.toBeInTheDocument();
	});
});
