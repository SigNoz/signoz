import { render, screen } from 'tests/test-utils';

import { useDashboardStore } from '../../../../store/useDashboardStore';
import ViewPanelModalHeader from '../ViewPanelModalHeader';
import type { DashboardControlsInput } from '../../../../controls/types';

jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEditContext',
	() => ({
		useDashboardEditContext: (): unknown => ({
			isEditable: true,
			editChecks: [],
			editDisabledTooltip: '',
		}),
	}),
);
jest.mock(
	'pages/DashboardPage/DashboardContainer/PanelEditor/ConfigPane/PanelTypeSwitcher/usePanelTypeSelectItems',
	() => ({ usePanelTypeSelectItems: (): unknown[] => [] }),
);

function renderHeader(
	readOnly: boolean,
	controls?: DashboardControlsInput,
): void {
	useDashboardStore.getState().setEditContext({
		dashboardId: 'dash-1',
		refetch: jest.fn(),
		readOnly,
		controls,
	});
	render(
		<ViewPanelModalHeader
			mode="static"
			panelKind="signoz/TimeSeriesPanel"
			onChangePanelKind={jest.fn()}
			onSwitchToEdit={jest.fn()}
		/>,
	);
}

describe('ViewPanelModalHeader - controls', () => {
	afterEach(() => {
		useDashboardStore
			.getState()
			.setEditContext({ dashboardId: '', refetch: jest.fn() });
	});

	it('offers Switch to Edit Mode on an editable mount', () => {
		renderHeader(false);

		expect(screen.getByTestId('view-panel-switch-to-edit')).toBeInTheDocument();
	});

	it('hides Switch to Edit Mode on a read-only mount', () => {
		renderHeader(true);

		expect(screen.getByTestId('view-panel-type-selector')).toBeInTheDocument();
		expect(
			screen.queryByTestId('view-panel-switch-to-edit'),
		).not.toBeInTheDocument();
	});

	it('hides Switch to Edit Mode when the host hides it', () => {
		renderHeader(false, { viewModal: false });

		expect(
			screen.queryByTestId('view-panel-switch-to-edit'),
		).not.toBeInTheDocument();
	});
});
