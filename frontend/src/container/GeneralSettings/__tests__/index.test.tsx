import type { Mock } from 'vitest';
import { useQueries } from 'react-query';
import { render, screen } from 'tests/test-utils';

import GeneralSettings from '../index';

vi.mock('react-query', async () => ({
	...(await vi.importActual('react-query')),
	useQueries: vi.fn(),
}));

const baseQueryResult = {
	isError: false,
	isLoading: false,
	isFetching: false,
	isSuccess: true,
	data: undefined,
	error: null,
	refetch: vi.fn(),
};

describe('GeneralSettings index', () => {
	it('renders fallback message when logs query fails with a non-APIError', () => {
		(useQueries as Mock).mockReturnValue([
			{ ...baseQueryResult },
			{ ...baseQueryResult },
			{
				...baseQueryResult,
				isError: true,
				isSuccess: false,
				error: new TypeError(
					"Cannot read properties of undefined (reading 'code')",
				),
			},
			{ ...baseQueryResult },
		]);

		render(<GeneralSettings />);

		expect(screen.getByText('something_went_wrong')).toBeInTheDocument();
	});
});
