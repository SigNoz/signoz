// prettyr-ignore
import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import TimezoneProvider from 'providers/Timezone';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

import AllErrors from '../index';
import {
	extractCompositeQueryObject,
	INIT_URL_WITH_COMMON_QUERY,
	MOCK_USE_QUERIES_DATA,
} from './constants';

const mockUseQueries = jest.fn();

// prettier-ignore
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueries: mockUseQueries,
}));
// prettier-ignore
jest.mock('hooks/useResourceAttribute', () =>
	jest.fn(() => ({
		queries: [],
	})),
);

function Exceptions({ initUrl }: { initUrl?: string[] }): JSX.Element {
	return (
		<MemoryRouter initialEntries={initUrl ?? ['/exceptions']}>
			<TimezoneProvider>
				<Provider store={store}>
					<MockQueryClientProvider>
						<AllErrors />
					</MockQueryClientProvider>
				</Provider>
			</TimezoneProvider>
		</MemoryRouter>
	);
}

Exceptions.defaultProps = {
	initUrl: ['/exceptions'],
};

describe('Exceptions - All Errors', () => {
	beforeEach(() => {
		mockUseQueries.mockReturnValue(MOCK_USE_QUERIES_DATA);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders correctly with default props', () => {
		const { container } = render(<Exceptions />);
		screen.debug(undefined, Infinity);
		expect(container).toMatchSnapshot();
	});

	it('should sort Error Message appropriately', () => {
		render(<Exceptions />);
		const caretIconUp = screen.getAllByLabelText('caret-up')[0];
		const caretIconDown = screen.getAllByLabelText('caret-down')[0];

		// sort by ascending
		expect(caretIconUp.className).not.toContain('active');
		fireEvent.click(caretIconUp);
		expect(caretIconUp.className).toContain('active');
		let queryParams = new URLSearchParams(window.location.search);
		expect(queryParams.get('order')).toBe('ascending');
		expect(queryParams.get('orderParam')).toBe('exceptionType');
		expect(mockUseQueries).toHaveBeenCalled();

		// sort by descending
		expect(caretIconDown.className).not.toContain('active');
		fireEvent.click(caretIconDown);
		expect(caretIconDown.className).toContain('active');
		queryParams = new URLSearchParams(window.location.search);
		expect(queryParams.get('order')).toBe('descending');
		expect(mockUseQueries).toHaveBeenCalled();
	});

	it('should call useQueries with exact composite query object', () => {
		render(<Exceptions initUrl={[INIT_URL_WITH_COMMON_QUERY]} />);

		expect(mockUseQueries).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					queryKey: expect.arrayContaining([
						expect.objectContaining(
							extractCompositeQueryObject(INIT_URL_WITH_COMMON_QUERY),
						),
					]),
				}),
			]),
		);
	});
});
