import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';

import { useDrilldownDashboardVariables } from '../hooks/useDrilldownDashboardVariables';

// Fake dashboard variables + runtime selection, mutated per test. `dtoToFormModel` is mocked as
// identity, so these DTOs are shaped like form models directly.
let mockVariables: Array<{
	name: string;
	type: string;
	dynamicAttribute?: string;
	multiSelect?: boolean;
}> = [];
let mockSelectionMap: Record<string, { value: unknown; allSelected: boolean }> =
	{};

const mockSetVariableValue = jest.fn();
const mockSetUrlValues = jest.fn();
const mockPatchAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('api/generated/services/dashboard', () => ({
	useGetDashboardV2: (): unknown => ({
		data: { data: { spec: { variables: mockVariables } } },
	}),
}));
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/hooks/useOptimisticPatch',
	() => ({
		useOptimisticPatch: (): unknown => ({ patchAsync: mockPatchAsync }),
	}),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore',
	() => ({
		useDashboardStore: (selector: (state: unknown) => unknown): unknown =>
			selector({
				dashboardId: 'd1',
				variableValues: { d1: mockSelectionMap },
				setVariableValue: mockSetVariableValue,
			}),
	}),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/DashboardSettings/Variables/variableAdapters',
	() => ({
		dtoToFormModel: (dto: unknown): unknown => dto,
		formModelToDto: (model: { name: string }): unknown => ({ dto: model.name }),
	}),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/DashboardSettings/Variables/variableFormModel',
	() => ({
		emptyVariableFormModel: (): unknown => ({}),
		DYNAMIC_SIGNAL_ALL: 'all',
	}),
);
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/VariablesBar/useVariableSelection',
	() => ({
		ALL_SELECTED: '__ALL__',
		variablesUrlParser: { withOptions: (): unknown => ({}) },
	}),
);
jest.mock('nuqs', () => ({
	useQueryState: (): unknown => [null, mockSetUrlValues],
}));
jest.mock('components/OverlayScrollbar/OverlayScrollbar', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));
jest.mock('@signozhq/ui/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const context: DrilldownContext = {
	queryName: 'A',
	signal: TelemetrytypesSignalDTO.metrics,
	filters: [
		{ filterKey: 'service.name', filterValue: 'frontend', operator: '=' },
	],
};

function renderItems(): void {
	const { result } = renderHook(() =>
		useDrilldownDashboardVariables({
			context,
			onBack: jest.fn(),
			onClose: jest.fn(),
		}),
	);
	render(<div>{result.current.items}</div>);
}

describe('useDrilldownDashboardVariables', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockVariables = [];
		mockSelectionMap = {};
	});

	it('hasFieldVariables reflects the clicked point group-by fields', () => {
		const withFields = renderHook(() =>
			useDrilldownDashboardVariables({
				context,
				onBack: jest.fn(),
				onClose: jest.fn(),
			}),
		);
		expect(withFields.result.current.hasFieldVariables).toBe(true);

		const noFields = renderHook(() =>
			useDrilldownDashboardVariables({
				context: { ...context, filters: [] },
				onBack: jest.fn(),
				onClose: jest.fn(),
			}),
		);
		expect(noFields.result.current.hasFieldVariables).toBe(false);
	});

	it('offers Set — writing an array for a multi-select var so the selector shows it', async () => {
		mockVariables = [
			{
				name: 'svc',
				type: 'DYNAMIC',
				dynamicAttribute: 'service.name',
				multiSelect: true,
			},
		];
		mockSelectionMap = { svc: { value: ['backend'], allSelected: false } };
		renderItems();

		await userEvent.click(screen.getByTestId('drilldown-var-set'));
		expect(mockSetVariableValue).toHaveBeenCalledWith('d1', 'svc', {
			value: ['frontend'],
			allSelected: false,
		});
	});

	it('offers Set — writing a scalar for a single-select var', async () => {
		mockVariables = [
			{
				name: 'svc',
				type: 'DYNAMIC',
				dynamicAttribute: 'service.name',
				multiSelect: false,
			},
		];
		mockSelectionMap = { svc: { value: 'backend', allSelected: false } };
		renderItems();

		await userEvent.click(screen.getByTestId('drilldown-var-set'));
		expect(mockSetVariableValue).toHaveBeenCalledWith('d1', 'svc', {
			value: 'frontend',
			allSelected: false,
		});
	});

	it('offers Unset when the matching dynamic var already holds the clicked value', async () => {
		mockVariables = [
			{
				name: 'svc',
				type: 'DYNAMIC',
				dynamicAttribute: 'service.name',
				multiSelect: true,
			},
		];
		mockSelectionMap = { svc: { value: ['frontend'], allSelected: false } };
		renderItems();

		await userEvent.click(screen.getByTestId('drilldown-var-unset'));
		expect(mockSetVariableValue).toHaveBeenCalledWith('d1', 'svc', {
			value: [],
			allSelected: false,
		});
	});

	it('offers Create and persists a new dynamic variable when none matches', async () => {
		mockVariables = [];
		renderItems();

		await userEvent.click(screen.getByTestId('drilldown-var-create'));
		// Persisted to the spec via the optimistic patch...
		expect(mockPatchAsync).toHaveBeenCalledTimes(1);
		// ...and seeded (as an array — the created var is multi-select) with the clicked value.
		expect(mockSetVariableValue).toHaveBeenCalledWith('d1', 'service.name', {
			value: ['frontend'],
			allSelected: false,
		});
	});

	it('ignores a non-dynamic variable with the same attribute (still offers Create)', () => {
		mockVariables = [
			{ name: 'svc', type: 'QUERY', dynamicAttribute: 'service.name' },
		];
		renderItems();

		expect(screen.getByTestId('drilldown-var-create')).toBeInTheDocument();
		expect(screen.queryByTestId('drilldown-var-set')).not.toBeInTheDocument();
	});
});
