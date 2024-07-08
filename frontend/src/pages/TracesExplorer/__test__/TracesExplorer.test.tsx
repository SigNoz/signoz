import { render } from 'tests/test-utils';

import { Filter } from '../Filter/Filter';

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};

	const uplotMock = jest.fn(() => ({
		paths,
	}));

	return {
		paths,
		default: uplotMock,
	};
});

describe('TracesExplorer - ', () => {
	// Initial filter panel rendering
	// Test the initial state like which filters section are opened, default state of duration slider, etc.
	it('should render the Trace filter', async () => {
		const { getByText } = render(<Filter setOpen={jest.fn()} />);

		[
			'Duration',
			'Status',
			'Service Name',
			'Operation / Name',
			'RPC Method',
		].forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});
	});
});
