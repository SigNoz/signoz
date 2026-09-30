import { screen, waitFor } from '@testing-library/react';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';

import SavedViewsHeader from '../SavedViewsHeader';
import { mockSavedViewsApi } from './savedViewsApiMock';
import {
	makeView,
	renderWithExplorerProviders,
	viewUrl,
} from './savedViewsTestUtils';

const PATH = ROUTES.TRACES_EXPLORER;

const baseView = makeView({ id: 'view-1', displayName: 'Errors' });
const withColumns = {
	...baseView,
	spec: {
		...baseView.spec,
		selectedFields: [{ name: 'service.name' }, { name: 'duration_nano' }],
	},
};

function renderHeader(url: string): void {
	renderWithExplorerProviders(
		<SavedViewsHeader
			source={SavedviewtypesSourceDTO.traces}
			onOpenViews={jest.fn()}
		/>,
		url,
	);
}

const chip = (): HTMLElement => screen.getByTestId('saved-views-name');
const isDirty = (): boolean => !!screen.queryByTestId('saved-views-discard');

describe('SavedViewsHeader when loading fails', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('keeps the view clean when only the views list fails', async () => {
		mockSavedViewsApi([withColumns], { listFailures: Number.POSITIVE_INFINITY });
		renderHeader(viewUrl(PATH, withColumns));

		await waitFor(() =>
			expect(screen.getByTestId('saved-views-clear')).toBeInTheDocument(),
		);
		expect(chip()).toHaveTextContent('Errors');
		expect(isDirty()).toBe(false);
	});
});
