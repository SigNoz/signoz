import { act, screen, waitFor } from '@testing-library/react';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { userEvent } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import SavedViewsHeader from '../SavedViewsHeader';
import SavedViewsRestore from '../SavedViewsRestore';
import { mockSavedViewsApi } from './savedViewsApiMock';
import {
	explorerUrl,
	makeView,
	queryWith,
	renderWithExplorerProviders,
	urlParam,
} from './savedViewsTestUtils';

const PATH = ROUTES.TRACES_EXPLORER;

const errors = makeView({ id: 'view-1', displayName: 'Errors' });

function renderHeader(
	url: string,
): ReturnType<typeof renderWithExplorerProviders> {
	return renderWithExplorerProviders(
		<>
			<SavedViewsRestore source={SavedviewtypesSourceDTO.traces} />
			<SavedViewsHeader
				source={SavedviewtypesSourceDTO.traces}
				onOpenViews={jest.fn()}
			/>
		</>,
		url,
	);
}

const chip = (): HTMLElement => screen.getByTestId('saved-views-name');

async function waitForView(name: string): Promise<void> {
	await waitFor(() => expect(chip()).toHaveTextContent(name));
	await waitFor(() =>
		expect(screen.getByTestId('saved-views-clear')).toBeInTheDocument(),
	);
}

describe('SavedViewsHeader last used view', () => {
	beforeEach(() => {
		localStorage.clear();
		localStorage.setItem(
			LOCALSTORAGE.LAST_USED_SAVED_VIEWS,
			JSON.stringify({ traces: { key: errors.id, value: 'Errors' } }),
		);
	});

	it('reopens on a bare explorer', async () => {
		mockSavedViewsApi([errors]);
		const { history } = renderHeader(explorerUrl(PATH, {}));

		await waitForView('Errors');
		expect(urlParam(history, QueryParams.viewKey)).toBe(
			JSON.stringify(errors.id),
		);
	});

	it('leaves a url with its own query alone', async () => {
		mockSavedViewsApi([errors]);
		const { history } = renderHeader(
			explorerUrl(PATH, {
				query: queryWith(DataSource.TRACES, 'service.name = "cart"'),
			}),
		);

		await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
		expect(chip()).toHaveTextContent('My view');
		expect(urlParam(history, QueryParams.viewKey)).toBeNull();
	});

	it('does not bring the view back once it is cleared', async () => {
		mockSavedViewsApi([errors]);
		const { history } = renderHeader(explorerUrl(PATH, {}));
		await waitForView('Errors');

		await userEvent.click(screen.getByTestId('saved-views-clear'));
		await act(() => new Promise((resolve) => setTimeout(resolve, 200)));

		expect(chip()).toHaveTextContent('My view');
		expect(urlParam(history, QueryParams.viewKey)).toBeNull();
	});

	it('forgets a last used view that no longer loads', async () => {
		mockSavedViewsApi([]);
		renderHeader(explorerUrl(PATH, {}));

		await waitFor(() =>
			expect(
				JSON.parse(
					localStorage.getItem(LOCALSTORAGE.LAST_USED_SAVED_VIEWS) ?? '{}',
				),
			).toStrictEqual({}),
		);
		expect(chip()).toHaveTextContent('My view');
	});

	it('starts on a bare explorer when the stored last used views are unreadable', async () => {
		localStorage.setItem(LOCALSTORAGE.LAST_USED_SAVED_VIEWS, '{not json');
		mockSavedViewsApi([errors]);
		renderHeader(explorerUrl(PATH, {}));

		await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
		expect(chip()).toHaveTextContent('My view');
	});
});
