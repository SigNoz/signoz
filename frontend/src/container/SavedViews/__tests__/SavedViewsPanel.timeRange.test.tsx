// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import store from 'store';
import { act, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { GlobalReducer } from 'types/reducer/globalTime';

import SavedViewsPanel from '../SavedViewsPanel';
import { mockSavedViewsApi } from './savedViewsApiMock';
import {
	expectRowUsable,
	explorerUrl,
	makeView,
	MENU_CHECK_TIMEOUT,
	renderWithExplorerProviders,
} from './savedViewsTestUtils';

const mockCopy: jest.MockedFunction<(text: string) => void> = jest.fn();

// copy-to-clipboard falls back to window.prompt in jsdom.
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, typeof mockCopy] => [null, mockCopy],
}));

const PATH = ROUTES.TRACES_EXPLORER;
const slow = makeView({ id: 'view-2', displayName: 'Slow spans' });

// A store whose global time can change while the panel stays mounted.
function renderPanelWithTime(selectedTime: GlobalReducer['selectedTime']): {
	setTime: (time: Partial<GlobalReducer>) => void;
} {
	let globalTime: GlobalReducer = {
		...store.getState().globalTime,
		selectedTime,
	};
	const timeStore = configureStore([thunk])(() => ({
		...store.getState(),
		globalTime,
	}));

	renderWithExplorerProviders(
		<Provider store={timeStore}>
			<SavedViewsPanel
				source={SavedviewtypesSourceDTO.traces}
				onClose={jest.fn()}
			/>
		</Provider>,
		explorerUrl(PATH, {}),
	);

	return {
		setTime: (time): void => {
			globalTime = { ...globalTime, ...time };
			act(() => {
				timeStore.dispatch({ type: 'TEST_TIME_CHANGED' });
			});
		},
	};
}

const row = (name: string): HTMLElement =>
	screen
		.getAllByTestId('saved-views-row')
		.find((element) => element.textContent?.includes(name)) as HTMLElement;

const relativeTimeOf = (link: string): string | null =>
	new URL(link, window.location.origin).searchParams.get(
		QueryParams.relativeTime,
	);

describe('SavedViewsPanel time range', () => {
	beforeEach(() => {
		localStorage.clear();
		mockCopy.mockClear();
		mockSavedViewsApi([slow]);
	});

	it('moves the row link to the new time range when it changes', async () => {
		const { setTime } = renderPanelWithTime('1h');
		await screen.findByTestId('saved-views-list');
		const name = within(row('Slow spans')).getByTestId('saved-views-row-name');
		expect(relativeTimeOf(name.getAttribute('href') as string)).toBe('1h');

		setTime({ selectedTime: '6h' });

		expect(relativeTimeOf(name.getAttribute('href') as string)).toBe('6h');
	});

	it('copies a link in the time range that is selected when it is copied', async () => {
		const { setTime } = renderPanelWithTime('1h');
		await screen.findByTestId('saved-views-list');
		setTime({ selectedTime: '6h' });

		await userEvent.click(
			within(row('Slow spans')).getByTestId('saved-views-row-menu'),
		);
		const copyLink = await screen.findByTestId(
			'saved-views-row-menu-item-copyLink',
		);
		await waitFor(() => expectRowUsable(copyLink), MENU_CHECK_TIMEOUT);
		await userEvent.click(copyLink);

		expect(mockCopy).toHaveBeenCalledTimes(1);
		expect(relativeTimeOf(mockCopy.mock.calls[0][0])).toBe('6h');
	});
});
