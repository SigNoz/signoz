import { act, screen } from 'tests/test-utils';

import { renderEntityTraces } from './testUtils';
import {
	mockQueryRangeV5WithError,
	mockQueryRangeV5WithKeyNotFoundError,
} from '__tests__/query_range_v5.util';

describe('EntityTraces - Error State', () => {
	it('should show error state on API error', async () => {
		mockQueryRangeV5WithError('Internal server error', 500);

		act(() => {
			renderEntityTraces();
		});

		await expect(
			screen.findByText(/Something went wrong/i),
		).resolves.toBeInTheDocument();
	});

	it('should show empty state for key not found error', async () => {
		mockQueryRangeV5WithKeyNotFoundError();

		act(() => {
			renderEntityTraces();
		});

		await expect(screen.findByText(/No data yet/i)).resolves.toBeInTheDocument();
	});

	it('should not show table on API error', async () => {
		mockQueryRangeV5WithError('Internal server error', 500);

		act(() => {
			renderEntityTraces();
		});

		await expect(
			screen.findByText(/Something went wrong/i),
		).resolves.toBeInTheDocument();
		expect(screen.queryByRole('table')).not.toBeInTheDocument();
	});
});
