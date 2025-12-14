import { ALL_SELECTED_VALUE } from 'components/NewSelect/utils';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { initializeDefaultVariables } from '../initializeDefaultVariables';

describe('initializeDefaultVariables', () => {
	let mockGetUrlVariables: jest.Mock;
	let mockUpdateUrlVariable: jest.Mock;

	beforeEach(() => {
		mockGetUrlVariables = jest.fn();
		mockUpdateUrlVariable = jest.fn();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const createMockVariable = (
		overrides: Partial<IDashboardVariable> = {},
	): IDashboardVariable => ({
		id: 'test-id',
		name: 'test-var',
		description: '',
		type: 'QUERY',
		sort: 'DISABLED',
		showALLOption: false,
		multiSelect: false,
		order: 0,
		allSelected: false,
		customValue: '',
		textboxValue: '',
		selectedValue: 'default',
		defaultValue: 'default',
		...overrides,
	});

	describe('Variable initialization', () => {
		it('should initialize variables when not present in URL and verify URL state', () => {
			const variables = {
				environment: createMockVariable({
					id: 'env-id',
					name: 'environment',
					selectedValue: 'production',
					allSelected: false,
					showALLOption: false,
				}),
			};

			mockGetUrlVariables.mockReturnValue({});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			// Verify the correct URL update was called
			expect(mockUpdateUrlVariable).toHaveBeenCalledWith(
				'environment',
				'production',
			);
			expect(mockUpdateUrlVariable).toHaveBeenCalledTimes(1);

			// Verify the correct parameters were passed
			const callArgs = mockUpdateUrlVariable.mock.calls[0];
			expect(callArgs[0]).toBe('environment'); // Variable name as key
			expect(callArgs[1]).toBe('production'); // selectedValue as value
		});

		it('should not initialize variables when already present in URL by name', () => {
			const variables = {
				environment: createMockVariable({
					id: 'env-id',
					name: 'environment',
					selectedValue: 'production',
				}),
			};

			mockGetUrlVariables.mockReturnValue({
				environment: 'development',
			});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			expect(mockUpdateUrlVariable).not.toHaveBeenCalled();
		});

		it('should not initialize variables when already present in URL by ID', () => {
			const variables = {
				environment: createMockVariable({
					id: 'env-id',
					name: 'environment',
					selectedValue: 'production',
				}),
			};

			mockGetUrlVariables.mockReturnValue({
				'env-id': 'development',
			});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			expect(mockUpdateUrlVariable).not.toHaveBeenCalled();
		});

		it('should handle variables with showALLOption when allSelected is true', () => {
			const variables = {
				services: createMockVariable({
					id: 'svc-id',
					name: 'services',
					multiSelect: true,
					selectedValue: ['api', 'web'],
					allSelected: true,
					showALLOption: true,
				}),
			};

			mockGetUrlVariables.mockReturnValue({});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			expect(mockUpdateUrlVariable).toHaveBeenCalledWith(
				'services',
				ALL_SELECTED_VALUE,
			);
		});

		it('should use selectedValue when allSelected is false', () => {
			const variables = {
				services: createMockVariable({
					id: 'svc-id',
					name: 'services',
					multiSelect: true,
					selectedValue: ['api', 'web'],
					allSelected: false,
					showALLOption: true,
				}),
			};

			mockGetUrlVariables.mockReturnValue({});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			expect(mockUpdateUrlVariable).toHaveBeenCalledWith('services', [
				'api',
				'web',
			]);
		});
	});

	describe('CUSTOM variable type', () => {
		it('should use parsed customValue for CUSTOM type variables', () => {
			const variables = {
				customVar: createMockVariable({
					id: 'custom-id',
					name: 'customVar',
					type: 'CUSTOM',
					customValue: 'value1,value2,value3',
					selectedValue: 'ignored',
				}),
			};

			mockGetUrlVariables.mockReturnValue({});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			expect(mockUpdateUrlVariable).toHaveBeenCalledWith('customVar', [
				'value1',
				'value2',
				'value3',
			]);
		});

		it('should handle empty customValue for CUSTOM type variables', () => {
			const variables = {
				customVar: createMockVariable({
					id: 'custom-id',
					name: 'customVar',
					type: 'CUSTOM',
					customValue: '',
					selectedValue: 'fallback',
				}),
			};

			mockGetUrlVariables.mockReturnValue({});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			expect(mockUpdateUrlVariable).toHaveBeenCalledWith('customVar', []);
		});
	});

	describe('Fallback to defaultValue', () => {
		it('should use defaultValue when selectedValue is not available', () => {
			const variables = {
				environment: createMockVariable({
					id: 'env-id',
					name: 'environment',
					selectedValue: undefined,
					defaultValue: 'staging',
				}),
			};

			mockGetUrlVariables.mockReturnValue({});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			expect(mockUpdateUrlVariable).toHaveBeenCalledWith('environment', 'staging');
		});

		it('should prefer selectedValue over defaultValue when available', () => {
			const variables = {
				environment: createMockVariable({
					id: 'env-id',
					name: 'environment',
					selectedValue: 'production',
					defaultValue: 'staging',
				}),
			};

			mockGetUrlVariables.mockReturnValue({});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			expect(mockUpdateUrlVariable).toHaveBeenCalledWith(
				'environment',
				'production',
			);
		});
	});

	describe('Edge cases', () => {
		it('should handle undefined variables gracefully', () => {
			expect(() => {
				initializeDefaultVariables(
					undefined as any,
					mockGetUrlVariables,
					mockUpdateUrlVariable,
				);
			}).not.toThrow();

			expect(mockUpdateUrlVariable).not.toHaveBeenCalled();
		});

		it('should prefer name over id for URL variable key', () => {
			const variables = {
				environment: createMockVariable({
					id: 'env-id',
					name: 'environment',
					selectedValue: 'production',
				}),
			};

			mockGetUrlVariables.mockReturnValue({});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			// Should use name as the key
			expect(mockUpdateUrlVariable).toHaveBeenCalledWith(
				'environment',
				'production',
			);
		});

		it('should use id as fallback when name is not available', () => {
			const variables = {
				environment: createMockVariable({
					id: 'env-id',
					name: undefined as any,
					selectedValue: 'production',
				}),
			};

			mockGetUrlVariables.mockReturnValue({});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			// Should use id as the key when name is not available
			expect(mockUpdateUrlVariable).toHaveBeenCalledWith('env-id', 'production');
		});
	});

	describe('Multiple variables handling', () => {
		it('should initialize multiple variables correctly', () => {
			const variables = {
				environment: createMockVariable({
					id: 'env-id',
					name: 'environment',
					selectedValue: 'production',
				}),
				services: createMockVariable({
					id: 'svc-id',
					name: 'services',
					multiSelect: true,
					selectedValue: ['api', 'web'],
				}),
				region: createMockVariable({
					id: 'region-id',
					name: 'region',
					selectedValue: 'us-east-1',
				}),
			};

			mockGetUrlVariables.mockReturnValue({
				environment: 'development', // This one exists in URL
				// services and region don't exist in URL
			});

			initializeDefaultVariables(
				variables,
				mockGetUrlVariables,
				mockUpdateUrlVariable,
			);

			// Should only initialize variables not in URL
			expect(mockUpdateUrlVariable).toHaveBeenCalledTimes(2);
			expect(mockUpdateUrlVariable).toHaveBeenCalledWith('services', [
				'api',
				'web',
			]);
			expect(mockUpdateUrlVariable).toHaveBeenCalledWith('region', 'us-east-1');
			expect(mockUpdateUrlVariable).not.toHaveBeenCalledWith(
				'environment',
				expect.anything(),
			);
		});
	});
});
