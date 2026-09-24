import { act, screen } from 'tests/test-utils';

import { renderEntityTraces } from './testUtils';
import { mockQueryRangeV5WithEmptyTraces } from '__tests__/query_range_v5.util';

describe('EntityTraces - Empty State', () => {
	it('should show empty state when no traces returned', async () => {
		mockQueryRangeV5WithEmptyTraces();

		act(() => {
			renderEntityTraces();
		});

		await expect(screen.findByText(/No data yet/i)).resolves.toBeInTheDocument();
	});

	it('should not show table when traces are empty', async () => {
		mockQueryRangeV5WithEmptyTraces();

		act(() => {
			renderEntityTraces();
		});

		await expect(screen.findByText(/No data yet/i)).resolves.toBeInTheDocument();
		expect(screen.queryByRole('table')).not.toBeInTheDocument();
	});

	it('should not show pagination controls when traces are empty', async () => {
		mockQueryRangeV5WithEmptyTraces();

		act(() => {
			renderEntityTraces();
		});

		await expect(screen.findByText(/No data yet/i)).resolves.toBeInTheDocument();
		expect(screen.queryByText(/1 - 10/)).not.toBeInTheDocument();
	});
});
