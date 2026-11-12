import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen } from 'tests/test-utils';

import { useDashboardStore } from '../../store/useDashboardStore';
import VariablesBar from '../VariablesBar';
import type { DashboardControlsInput } from '../../controls/types';

const dashboard = {
	id: 'dash-1',
	spec: { display: { name: 'D' }, panels: {}, layouts: [], variables: [] },
} as unknown as DashboardtypesGettableDashboardV2DTO;

jest.mock('../../hooks/useDashboardEditContext', () => ({
	useDashboardEditContext: (): unknown => ({
		isEditable: false,
		editChecks: [],
		editDisabledTooltip: '',
	}),
}));
jest.mock('../hooks/useVariableSelection', () => ({
	useVariableSelection: (): unknown => ({
		variables: [{ name: 'env' }, { name: 'service' }],
		selection: {},
		setSelection: jest.fn(),
		autoSelect: jest.fn(),
	}),
}));
jest.mock('../components/VariableSelector/VariableSelector', () => ({
	__esModule: true,
	default: ({ variable }: { variable: { name: string } }): JSX.Element => (
		<div data-testid={`variable-selector-${variable.name}`} />
	),
}));

function renderBar(
	readOnly: boolean,
	controls?: DashboardControlsInput,
	variables?: Record<string, string>,
): void {
	useDashboardStore.getState().setEditContext({
		dashboardId: 'dash-1',
		refetch: jest.fn(),
		readOnly,
		controls,
		variables,
	});
	render(<VariablesBar dashboard={dashboard} />);
}

describe('VariablesBar - controls', () => {
	afterEach(() => {
		useDashboardStore
			.getState()
			.setEditContext({ dashboardId: '', refetch: jest.fn() });
	});

	it('offers the add-variable trigger, disabled, to a viewer', () => {
		renderBar(false);

		expect(screen.getByTestId('dashboard-variables-add')).toBeInTheDocument();
	});

	it('renders the selectors but no add-variable trigger', () => {
		renderBar(true);

		expect(screen.getByTestId('variable-selector-env')).toBeInTheDocument();
		expect(
			screen.queryByTestId('dashboard-variables-add'),
		).not.toBeInTheDocument();
	});

	it('renders no add-variable trigger when the host hides it', () => {
		renderBar(false, { toolbar: { addVariable: false } });

		expect(
			screen.queryByTestId('dashboard-variables-add'),
		).not.toBeInTheDocument();
	});

	it('renders no selector for a variable the page sets', () => {
		renderBar(false, undefined, { service: 'frontend' });

		expect(screen.getByTestId('variable-selector-env')).toBeInTheDocument();
		expect(
			screen.queryByTestId('variable-selector-service'),
		).not.toBeInTheDocument();
	});
});
