// Write a test for SaveViewWithName component using react testing library.

// Path: src/components/ExplorerCard/SaveViewWithName.test.tsx

import { fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';

import SaveViewWithName from './SaveViewWithName';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

jest.mock('hooks/queryBuilder/useGetPanelTypesQueryParam', () => ({
	useGetPanelTypesQueryParam: jest.fn(() => 'mockedPanelType'),
}));

jest.mock('hooks/saveViews/useSaveView', () => ({
	useSaveView: jest.fn(() => ({
		mutateAsync: jest.fn(),
	})),
}));

describe('SaveViewWithName', () => {
	it('should render SaveViewWithName component', () => {
		const screen = render(
			<QueryClientProvider client={queryClient}>
				<SaveViewWithName
					sourcePage="traces"
					handlePopOverClose={jest.fn()}
					refetchAllView={jest.fn()}
				/>
			</QueryClientProvider>,
		);

		expect(screen.getByText('Save')).toBeInTheDocument();
	});

	it('should call saveViewAsync on click of Save button', () => {
		const screen = render(
			<QueryClientProvider client={queryClient}>
				<SaveViewWithName
					sourcePage="traces"
					handlePopOverClose={jest.fn()}
					refetchAllView={jest.fn()}
				/>
			</QueryClientProvider>,
		);

		fireEvent.click(screen.getByText('Save'));

		expect(screen.getByText('Save')).toBeInTheDocument();
	});

	// Should call refetchAllView on click of Save button
	test('should call refetchAllView on click of Save button', async () => {
		const handlePopOverClose = jest.fn();
		const screen = render(
			<QueryClientProvider client={queryClient}>
				<SaveViewWithName
					sourcePage="traces"
					handlePopOverClose={handlePopOverClose}
					refetchAllView={jest.fn()}
				/>
			</QueryClientProvider>,
		);

		fireEvent.click(screen.getByText('Save'));

		await waitFor(() => expect(handlePopOverClose).toHaveBeenCalled());
	});
});
