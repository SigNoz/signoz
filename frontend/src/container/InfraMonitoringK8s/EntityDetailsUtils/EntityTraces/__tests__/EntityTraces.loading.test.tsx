import { act, screen, waitFor } from 'tests/test-utils';

import { renderEntityTraces } from './testUtils';
import { mockQueryRangeV5WithTracesResponse } from '__tests__/query_range_v5.util';

describe('EntityTraces - Loading State', () => {
	it('should show loading state while fetching', async () => {
		mockQueryRangeV5WithTracesResponse({ delay: 1000 });

		act(() => {
			renderEntityTraces();
		});

		await expect(
			screen.findByText(/pending_data_placeholder/i),
		).resolves.toBeInTheDocument();
	});

	it('should hide loading state after data loads', async () => {
		mockQueryRangeV5WithTracesResponse({ delay: 100 });

		act(() => {
			renderEntityTraces();
		});

		await expect(
			screen.findByText(/pending_data_placeholder/i),
		).resolves.toBeInTheDocument();

		await waitFor(
			() => {
				expect(
					screen.queryByText(/pending_data_placeholder/i),
				).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});
});
