import { renderHook } from '@testing-library/react';
import { useDashboardVariablesFromLocalStorage } from 'hooks/dashboard/useDashboardFromLocalStorage';
import { useTransformDashboardVariables } from 'hooks/dashboard/useTransformDashboardVariables';
import useVariablesFromUrl from 'hooks/dashboard/useVariablesFromUrl';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';

jest.mock('hooks/dashboard/useDashboardFromLocalStorage');
jest.mock('hooks/dashboard/useVariablesFromUrl');

const mockUseDashboardVariablesFromLocalStorage = useDashboardVariablesFromLocalStorage as jest.MockedFunction<
	typeof useDashboardVariablesFromLocalStorage
>;
const mockUseVariablesFromUrl = useVariablesFromUrl as jest.MockedFunction<
	typeof useVariablesFromUrl
>;

const makeVariable = (
	overrides: Partial<IDashboardVariable> = {},
): IDashboardVariable => ({
	id: 'existing-id',
	name: 'env',
	description: '',
	type: 'QUERY',
	sort: 'DISABLED',
	multiSelect: false,
	showALLOption: false,
	selectedValue: 'prod',
	...overrides,
});

const makeDashboard = (
	variables: Record<string, IDashboardVariable>,
): Dashboard => ({
	id: 'dash-1',
	createdAt: '',
	updatedAt: '',
	createdBy: '',
	updatedBy: '',
	data: {
		title: 'Test',
		variables,
	},
});

const setupHook = (
	currentDashboard: Record<string, any> = {},
	urlVariables: Record<string, any> = {},
): ReturnType<typeof useTransformDashboardVariables> => {
	mockUseDashboardVariablesFromLocalStorage.mockReturnValue({
		currentDashboard,
		updateLocalStorageDashboardVariables: jest.fn(),
	});
	mockUseVariablesFromUrl.mockReturnValue({
		getUrlVariables: () => urlVariables,
		setUrlVariables: jest.fn(),
		updateUrlVariable: jest.fn(),
	});

	const { result } = renderHook(() => useTransformDashboardVariables('dash-1'));
	return result.current;
};

describe('useTransformDashboardVariables', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('order assignment', () => {
		it('assigns order starting from 0 to variables that have none', () => {
			const { transformDashboardVariables } = setupHook();
			const dashboard = makeDashboard({
				v1: makeVariable({ id: 'id1', name: 'v1', order: undefined }),
				v2: makeVariable({ id: 'id2', name: 'v2', order: undefined }),
			});

			const result = transformDashboardVariables(dashboard);

			const orders = Object.values(result.data.variables).map((v) => v.order);
			expect(orders).toContain(0);
			expect(orders).toContain(1);
		});

		it('preserves existing order values', () => {
			const { transformDashboardVariables } = setupHook();
			const dashboard = makeDashboard({
				v1: makeVariable({ id: 'id1', name: 'v1', order: 5 }),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.order).toBe(5);
		});

		it('assigns unique orders across multiple variables that all lack an order', () => {
			const { transformDashboardVariables } = setupHook();
			const dashboard = makeDashboard({
				v1: makeVariable({ id: 'id1', name: 'v1', order: undefined }),
				v2: makeVariable({ id: 'id2', name: 'v2', order: undefined }),
				v3: makeVariable({ id: 'id3', name: 'v3', order: undefined }),
			});

			const result = transformDashboardVariables(dashboard);

			const orders = Object.values(result.data.variables).map((v) => v.order);
			// All three newly assigned orders must be distinct
			expect(new Set(orders).size).toBe(3);
		});
	});

	describe('ID assignment', () => {
		it('assigns a UUID to variables that have no id', () => {
			const { transformDashboardVariables } = setupHook();
			const variable = makeVariable({ name: 'v1' });
			(variable as any).id = undefined;
			const dashboard = makeDashboard({ v1: variable });

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		it('preserves existing IDs', () => {
			const { transformDashboardVariables } = setupHook();
			const dashboard = makeDashboard({
				v1: makeVariable({ id: 'keep-me', name: 'v1' }),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.id).toBe('keep-me');
		});
	});

	describe('TEXTBOX backward compatibility', () => {
		it('copies textboxValue to defaultValue when defaultValue is missing', () => {
			const { transformDashboardVariables } = setupHook();
			const dashboard = makeDashboard({
				v1: makeVariable({
					id: 'id1',
					name: 'v1',
					type: 'TEXTBOX',
					textboxValue: 'hello',
					defaultValue: undefined,
					order: undefined,
				}),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.defaultValue).toBe('hello');
		});

		it('does not overwrite an existing defaultValue', () => {
			const { transformDashboardVariables } = setupHook();
			const dashboard = makeDashboard({
				v1: makeVariable({
					id: 'id1',
					name: 'v1',
					type: 'TEXTBOX',
					textboxValue: 'old',
					defaultValue: 'keep',
					order: undefined,
				}),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.defaultValue).toBe('keep');
		});
	});

	describe('localStorage merge', () => {
		it('applies localStorage selectedValue over DB value', () => {
			const { transformDashboardVariables } = setupHook({
				env: { selectedValue: 'staging', allSelected: false },
			});
			const dashboard = makeDashboard({
				v1: makeVariable({ id: 'id1', name: 'env', selectedValue: 'prod' }),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.selectedValue).toBe('staging');
		});

		it('applies localStorage allSelected over DB value', () => {
			const { transformDashboardVariables } = setupHook({
				env: { selectedValue: undefined, allSelected: true },
			});
			const dashboard = makeDashboard({
				v1: makeVariable({
					id: 'id1',
					name: 'env',
					allSelected: false,
					showALLOption: true,
				}),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.allSelected).toBe(true);
		});
	});

	describe('URL variable override', () => {
		it('sets allSelected=true when URL value is __ALL__', () => {
			const { transformDashboardVariables } = setupHook(
				{ env: { selectedValue: 'prod', allSelected: false } },
				{ env: '__ALL__' },
			);
			const dashboard = makeDashboard({
				v1: makeVariable({
					id: 'id1',
					name: 'env',
					showALLOption: true,
					allSelected: false,
				}),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.allSelected).toBe(true);
		});

		it('sets selectedValue from URL and clears allSelected when showALLOption is true', () => {
			const { transformDashboardVariables } = setupHook(
				{ env: { selectedValue: undefined, allSelected: true } },
				{ env: 'dev' },
			);
			const dashboard = makeDashboard({
				v1: makeVariable({
					id: 'id1',
					name: 'env',
					showALLOption: true,
					allSelected: true,
					multiSelect: false,
				}),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.selectedValue).toBe('dev');
			expect(result.data.variables.v1.allSelected).toBe(false);
		});

		it('does not set allSelected=false when showALLOption is false', () => {
			const { transformDashboardVariables } = setupHook(
				{ env: { selectedValue: undefined, allSelected: true } },
				{ env: 'dev' },
			);
			const dashboard = makeDashboard({
				v1: makeVariable({
					id: 'id1',
					name: 'env',
					showALLOption: false,
					allSelected: true,
					multiSelect: false,
				}),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.selectedValue).toBe('dev');
			expect(result.data.variables.v1.allSelected).toBe(true);
		});

		it('normalizes array URL value to single value for single-select variable', () => {
			const { transformDashboardVariables } = setupHook(
				{},
				{ env: ['prod', 'dev'] },
			);
			const dashboard = makeDashboard({
				v1: makeVariable({
					id: 'id1',
					name: 'env',
					multiSelect: false,
				}),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.selectedValue).toBe('prod');
		});

		it('wraps single URL value in array for multi-select variable', () => {
			const { transformDashboardVariables } = setupHook({}, { env: 'prod' });
			const dashboard = makeDashboard({
				v1: makeVariable({
					id: 'id1',
					name: 'env',
					multiSelect: true,
				}),
			});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.selectedValue).toEqual(['prod']);
		});

		it('looks up URL variable by variable id when name is absent', () => {
			const { transformDashboardVariables } = setupHook(
				{},
				{ 'var-uuid': 'fallback' },
			);
			const variable = makeVariable({ id: 'var-uuid', multiSelect: false });
			delete variable.name;
			const dashboard = makeDashboard({ v1: variable });

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables.v1.selectedValue).toBe('fallback');
		});
	});

	describe('edge cases', () => {
		it('returns data unchanged when there are no variables', () => {
			const { transformDashboardVariables } = setupHook();
			const dashboard = makeDashboard({});

			const result = transformDashboardVariables(dashboard);

			expect(result.data.variables).toEqual({});
		});

		it('does not mutate the original dashboard', () => {
			const { transformDashboardVariables } = setupHook({
				env: { selectedValue: 'staging', allSelected: false },
			});
			const dashboard = makeDashboard({
				v1: makeVariable({ id: 'id1', name: 'env', selectedValue: 'prod' }),
			});
			const originalValue = dashboard.data.variables.v1.selectedValue;

			transformDashboardVariables(dashboard);

			expect(dashboard.data.variables.v1.selectedValue).toBe(originalValue);
		});
	});
});
