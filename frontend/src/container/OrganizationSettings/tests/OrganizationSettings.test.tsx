import { act, render, screen, waitFor } from 'tests/test-utils';

import Members from '../Members';

describe('Organization Settings Page', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('render list of members', async () => {
		act(() => {
			render(<Members />);
		});

		const title = await screen.findByText(/Members/i);
		expect(title).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText('firstUser@test.io')).toBeInTheDocument(); // first item
			expect(screen.getByText('lastUser@test.io')).toBeInTheDocument(); // last item
		});
	});

	// this is required as our edit/delete logic is dependent on the index and it will break with pagination enabled
	it('render list of members without pagination', async () => {
		render(<Members />);

		await waitFor(() => {
			expect(screen.getByText('firstUser@test.io')).toBeInTheDocument(); // first item
			expect(screen.getByText('lastUser@test.io')).toBeInTheDocument(); // last item

			expect(
				document.querySelector('.ant-table-pagination'),
			).not.toBeInTheDocument();
		});
	});
});
