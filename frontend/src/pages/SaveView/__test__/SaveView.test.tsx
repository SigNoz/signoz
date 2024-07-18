/* eslint-disable sonarjs/no-duplicate-string */
import { explorerView } from 'mocks-server/__mockdata__/explorer_views';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { fireEvent, render, screen, waitFor, within } from 'tests/test-utils';

import SaveView from '..';

describe('SaveView', () => {
	it('should render the SaveView component', async () => {
		render(<SaveView />);
		expect(await screen.findByText('Table View')).toBeInTheDocument();

		const savedViews = screen.getAllByRole('row');
		expect(savedViews).toHaveLength(2);

		// assert row 1
		expect(
			within(document.querySelector('.view-tag') as HTMLElement).getByText('T'),
		).toBeInTheDocument();
		expect(screen.getByText('test-user-1')).toBeInTheDocument();
		expect(screen.getByText('23:34:10 ⎯ Aug 29, 2023')).toBeInTheDocument();

		// assert row 2
		expect(screen.getByText('R-test panel')).toBeInTheDocument();
		expect(screen.getByText('test-user-test')).toBeInTheDocument();
	});

	// it('explorer icon should take the user to the related explorer page', async () => {
	// 	render(<SaveView />);

	// 	expect(await screen.findByText('Table View')).toBeInTheDocument();

	// 	const explorerIcon = await screen.findAllByTestId('go-to-explorer');
	// 	expect(explorerIcon[0]).toBeInTheDocument();
	// 	// expect(explorerIcon[0]).toHaveAttribute('href', '/traces-explorer');

	// 	// Simulate click on explorer icon
	// 	fireEvent.click(explorerIcon[0]);

	// 	await waitFor(() => expect(restt).toHaveBeenCalled());

	// 	await waitFor(() => expect(window.location.href).toBe('/traces-explorer'));
	// });

	// it('should render the SaveView component with a search input', async () => {
	// 	const { container, getByText } = render(<SaveView />);
	// 	const searchInput = screen.getByPlaceholderText('Search for views...');
	// 	expect(searchInput).toBeInTheDocument();

	// 	// search for 'R-test panel'
	// 	searchInput.focus();
	// 	(searchInput as HTMLInputElement).setSelectionRange(
	// 		0,
	// 		(searchInput as HTMLInputElement).value.length,
	// 	);

	// 	fireEvent.change(searchInput, { target: { value: 'R-test panel' } });
	// 	expect(searchInput).toHaveValue('R-test panel');
	// 	searchInput.blur();

	// 	expect(await screen.findByText('R-test panel')).toBeInTheDocument();
	// });

	it('should be able to edit name of view', async () => {
		server.use(
			rest.put(
				'http://localhost/api/v1/explorer/views/test-uuid-1',
				// eslint-disable-next-line no-return-assign
				(_req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							...explorerView,
							data: [
								...explorerView.data,
								(explorerView.data[0].name = 'New Table View'),
							],
						}),
					),
			),
		);
		render(<SaveView />);

		const editButton = await screen.findAllByTestId('edit-view');
		fireEvent.click(editButton[0]);

		const viewName = await screen.findByTestId('view-name');
		expect(viewName).toBeInTheDocument();
		expect(viewName).toHaveValue('Table View');

		const newViewName = 'New Table View';
		fireEvent.change(viewName, { target: { value: newViewName } });
		expect(viewName).toHaveValue(newViewName);

		const saveButton = await screen.findByTestId('save-view');
		fireEvent.click(saveButton);

		await waitFor(() =>
			expect(screen.getByText(newViewName)).toBeInTheDocument(),
		);
	});

	it('should be able to delete a view', async () => {
		server.use(
			rest.delete(
				'http://localhost/api/v1/explorer/views/test-uuid-1',
				(_req, res, ctx) => res(ctx.status(200), ctx.json({ status: 'success' })),
			),
		);

		render(<SaveView />);

		const deleteButton = await screen.findAllByTestId('delete-view');
		fireEvent.click(deleteButton[0]);

		expect(await screen.findByText('delete_confirm_message')).toBeInTheDocument();

		const confirmButton = await screen.findByTestId('confirm-delete');
		fireEvent.click(confirmButton);

		await waitFor(() => expect(screen.queryByText('Table View')).toBeNull());
	});

	it('should render empty state', async () => {
		server.use(
			rest.get('http://localhost/api/v1/explorer/views', (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: [],
					}),
				),
			),
		);
		render(<SaveView />);

		expect(screen.getByText('No data')).toBeInTheDocument();
	});
});
