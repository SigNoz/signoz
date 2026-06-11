import { useQueries } from 'react-query';
import { render, screen } from 'tests/test-utils';

import GeneralSettings from '../index';

jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueries: jest.fn(),
}));

const baseQueryResult = {
	isError: false,
	isLoading: false,
	isFetching: false,
	isSuccess: true,
	data: undefined,
	error: null,
	refetch: jest.fn(),
};

describe('GeneralSettings index', () => {
	it('renders fallback message when logs query fails with a non-APIError', () => {
		(useQueries as jest.Mock).mockReturnValue([
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
