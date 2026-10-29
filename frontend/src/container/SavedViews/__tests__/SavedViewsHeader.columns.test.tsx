import { useState } from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@signozhq/ui/button';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';

import SavedViewsHeader from '../SavedViewsHeader';
import { mockSavedViewsApi } from './savedViewsApiMock';
import {
	expectRowUsable,
	makeView,
	MENU_CHECK_TIMEOUT,
	renderWithExplorerProviders,
	viewUrl,
} from './savedViewsTestUtils';

const PATH = ROUTES.TRACES_EXPLORER;

const baseView = makeView({ id: 'view-1', displayName: 'Errors' });
const errors = {
	...baseView,
	spec: {
		...baseView.spec,
		selectedFields: [{ name: 'service.name' }, { name: 'name' }],
	},
};

function Harness(): JSX.Element {
	const traces = usePreferenceContext()[SavedviewtypesSourceDTO.traces];
	const [headerKey, setHeaderKey] = useState(0);
	const columns = traces.preferences?.columns ?? [];

	return (
		<>
			<SavedViewsHeader
				key={headerKey}
				source={SavedviewtypesSourceDTO.traces}
				onOpenViews={jest.fn()}
			/>
			<span data-testid="columns">
				{columns.map((column) => column.name).join(',')}
			</span>
			<Button
				size="md"
				variant="solid"
				color="primary"
				testId="add-column"
				onClick={(): void =>
					traces.updateColumns([...columns, { name: `extra-${columns.length}` }])
				}
			>
				Add column
			</Button>
			<Button
				size="md"
				variant="solid"
				color="primary"
				testId="remount-header"
				onClick={(): void => setHeaderKey((key) => key + 1)}
			>
				Remount header
			</Button>
		</>
	);
}

const columnsText = (): string | null =>
	screen.getByTestId('columns').textContent;
const isDirty = (): boolean => !!screen.queryByTestId('saved-views-discard');

async function openView(): Promise<void> {
	renderWithExplorerProviders(<Harness />, viewUrl(PATH, errors));
	await waitFor(() =>
		expect(screen.getByTestId('saved-views-name')).toHaveTextContent('Errors'),
	);
	await waitFor(() => expect(columnsText()).toBe('service.name,name'));
}

describe('SavedViewsHeader columns', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('keeps edited columns when the view is fetched again', async () => {
		mockSavedViewsApi([errors]);
		await openView();

		await userEvent.click(screen.getByTestId('add-column'));
		await waitFor(() => expect(isDirty()).toBe(true));

		await userEvent.click(screen.getByTestId('remount-header'));
		await act(() => new Promise((resolve) => setTimeout(resolve, 200)));

		expect(columnsText()).toBe('service.name,name,extra-2');
		expect(isDirty()).toBe(true);
	});

	it('discard puts the saved columns back', async () => {
		mockSavedViewsApi([errors]);
		await openView();

		await userEvent.click(screen.getByTestId('add-column'));
		await waitFor(() => expect(isDirty()).toBe(true));

		await userEvent.click(screen.getByTestId('saved-views-discard'));

		await waitFor(() => expect(columnsText()).toBe('service.name,name'));
		expect(isDirty()).toBe(false);
	});

	it('discard after an update goes back to the updated columns', async () => {
		mockSavedViewsApi([errors]);
		await openView();

		await userEvent.click(screen.getByTestId('add-column'));
		await waitFor(() => expect(isDirty()).toBe(true));
		await userEvent.click(screen.getByTestId('saved-views-save-changes'));
		const update = await screen.findByTestId(
			'saved-views-save-changes-item-update',
		);
		await waitFor(() => expectRowUsable(update), MENU_CHECK_TIMEOUT);
		await userEvent.click(update);
		await waitFor(() => expect(isDirty()).toBe(false));

		await userEvent.click(screen.getByTestId('add-column'));
		await waitFor(() => expect(isDirty()).toBe(true));
		await userEvent.click(screen.getByTestId('saved-views-discard'));

		await waitFor(() => expect(columnsText()).toBe('service.name,name,extra-2'));
		expect(isDirty()).toBe(false);
	});
});
