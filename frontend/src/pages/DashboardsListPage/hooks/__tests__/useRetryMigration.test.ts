import { renderHook } from '@testing-library/react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import {
	invalidateListDashboardsForUserV2,
	useMigrateDashboardV2,
} from 'api/generated/services/dashboard';

import { useRetryMigration } from '../useRetryMigration';

jest.mock('react-query', () => ({
	useQueryClient: jest.fn(),
}));

jest.mock('api/generated/services/dashboard', () => ({
	useMigrateDashboardV2: jest.fn(),
	invalidateListDashboardsForUserV2: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@signozhq/ui/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const queryClient = { invalidateQueries: jest.fn() };
const mockMutate = jest.fn();
const onMigrated = jest.fn();

type MutationHandlers = {
	onSuccess: () => Promise<void>;
	onError: (error: unknown) => void;
};

let captured: MutationHandlers;

// Stands in for the generated mutation hook: records the handlers the hook wires
// up so each one can be driven directly, and reports the requested in-flight state.
function setup(isLoading = false): {
	retryMigration: (id: string) => void;
	isMigrating: boolean;
} {
	(useMigrateDashboardV2 as jest.Mock).mockImplementation(
		(options: { mutation: MutationHandlers }) => {
			captured = options.mutation;
			return { mutate: mockMutate, isLoading };
		},
	);
	return renderHook(() => useRetryMigration(onMigrated)).result.current;
}

// A 501 from GET/POST on an un-migrated dashboard carries the render error envelope.
const envelopeError = {
	response: {
		status: 501,
		data: {
			error: { code: 'dashboard_invalid_data', message: 'not in v6 schema' },
		},
	},
	message: 'Request failed with status code 501',
};

// A gateway failure responds without an envelope, so there is no backend reason to show.
const bodylessError = {
	response: { status: 502, data: '<html>bad gateway</html>' },
	message: 'Request failed with status code 502',
};

describe('useRetryMigration', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useQueryClient as jest.Mock).mockReturnValue(queryClient);
	});

	it('sends the dashboard id as a path parameter', () => {
		setup().retryMigration('dash-1');
		expect(mockMutate).toHaveBeenCalledWith({ pathParams: { id: 'dash-1' } });
	});

	it('refreshes the list, confirms with a toast and reports success', async () => {
		setup();
		await captured.onSuccess();

		expect(invalidateListDashboardsForUserV2).toHaveBeenCalledWith(queryClient);
		expect(toast.success).toHaveBeenCalledWith(
			'Dashboard migrated to the new experience',
		);
		expect(onMigrated).toHaveBeenCalledTimes(1);
	});

	it('surfaces the backend reason and does not report success on failure', () => {
		setup();
		captured.onError(envelopeError);

		expect(toast.error).toHaveBeenCalledWith('not in v6 schema');
		expect(onMigrated).not.toHaveBeenCalled();
	});

	it('points the user at support when the failure carries no reason', () => {
		setup();
		captured.onError(bodylessError);

		expect(toast.error).toHaveBeenCalledWith(
			'Could not migrate this dashboard. Please contact support.',
		);
	});

	it('reports the in-flight state from the mutation', () => {
		expect(setup(true).isMigrating).toBe(true);
	});
});
