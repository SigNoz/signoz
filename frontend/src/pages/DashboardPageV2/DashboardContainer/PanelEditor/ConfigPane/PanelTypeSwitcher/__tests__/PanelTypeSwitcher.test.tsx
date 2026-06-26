import { fireEvent, render, screen } from '@testing-library/react';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';

import PanelTypeSwitcher from '../PanelTypeSwitcher';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

jest.mock('pages/DashboardPageV2/DashboardContainer/Panels/registry', () => ({
	getPanelDefinition: jest.fn(),
}));

const mockGetPanelDefinition = getPanelDefinition as unknown as jest.Mock;

function openDropdown(): void {
	fireEvent.mouseDown(screen.getByRole('combobox'));
}

describe('PanelTypeSwitcher', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// List supports only logs/traces; every other kind also supports metrics.
		mockGetPanelDefinition.mockImplementation((kind: string) => ({
			supportedSignals:
				kind === 'signoz/ListPanel'
					? ['logs', 'traces']
					: ['metrics', 'logs', 'traces'],
		}));
	});

	it('fires onChange with the chosen plugin kind', () => {
		const onChange = jest.fn();
		render(
			<PanelTypeSwitcher panelKind="signoz/TimeSeriesPanel" onChange={onChange} />,
		);

		openDropdown();
		fireEvent.click(screen.getByText('List'));

		expect(onChange).toHaveBeenCalledWith('signoz/ListPanel');
	});

	it('disables types whose supported signals exclude the current datasource', () => {
		render(
			<PanelTypeSwitcher
				panelKind="signoz/TimeSeriesPanel"
				signal={TelemetrytypesSignalDTO.metrics}
				onChange={jest.fn()}
			/>,
		);

		openDropdown();
		const disabled = Array.from(
			document.querySelectorAll('.ant-select-item-option-disabled'),
		).map((el) => el.textContent);

		// List can't render a metrics query, so it's disabled; Time Series stays enabled.
		expect(disabled).toContain('List');
		expect(disabled).not.toContain('Time Series');
	});

	it('does not disable any type when the datasource is unknown', () => {
		render(
			<PanelTypeSwitcher
				panelKind="signoz/TimeSeriesPanel"
				onChange={jest.fn()}
			/>,
		);

		openDropdown();
		expect(
			document.querySelectorAll('.ant-select-item-option-disabled'),
		).toHaveLength(0);
	});
});
