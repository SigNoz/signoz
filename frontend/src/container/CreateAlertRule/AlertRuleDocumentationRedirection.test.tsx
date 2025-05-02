import ROUTES from 'constants/routes';
import CreateAlertPage from 'pages/CreateAlert';
import { MemoryRouter, Route } from 'react-router-dom';
import { act, fireEvent, render } from 'tests/test-utils';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { ALERT_TYPE_TO_TITLE, ALERT_TYPE_URL_MAP } from './constants';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.ALERTS_NEW}`,
	}),
}));

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

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

let mockWindowOpen: jest.Mock;

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

function findLinkForAlertType(
	links: HTMLElement[],
	alertType: AlertTypes,
): HTMLElement {
	const link = links.find(
		(el) =>
			el.closest('[data-testid]')?.getAttribute('data-testid') ===
			`alert-type-card-${alertType}`,
	);
	expect(link).toBeTruthy();
	return link as HTMLElement;
}

function clickLinkAndVerifyRedirect(
	link: HTMLElement,
	expectedUrl: string,
): void {
	fireEvent.click(link);
	expect(mockWindowOpen).toHaveBeenCalledWith(expectedUrl, '_blank');
}
describe('Alert rule documentation redirection', () => {
	let renderResult: ReturnType<typeof render>;

	beforeAll(() => {
		mockWindowOpen = jest.fn();
		window.open = mockWindowOpen;
	});

	beforeEach(() => {
		act(() => {
			renderResult = render(
				<MemoryRouter initialEntries={['/alerts/new']}>
					<Route path={ROUTES.ALERTS_NEW}>
						<CreateAlertPage />
					</Route>
				</MemoryRouter>,
			);
		});
	});

	it('should render alert type cards', () => {
		const { getByText, getAllByText } = renderResult;

		// Check for the heading
		expect(getByText('choose_alert_type')).toBeInTheDocument();

		// Check for alert type titles and descriptions
		Object.values(AlertTypes).forEach((alertType) => {
			const title = ALERT_TYPE_TO_TITLE[alertType];
			expect(getByText(title)).toBeInTheDocument();
			expect(getByText(`${title}_desc`)).toBeInTheDocument();
		});

		const clickHereLinks = getAllByText(
			'Click here to see how to create a sample alert.',
		);

		expect(clickHereLinks).toHaveLength(5);
	});

	it('should redirect to correct documentation for each alert type', () => {
		const { getAllByText } = renderResult;

		const clickHereLinks = getAllByText(
			'Click here to see how to create a sample alert.',
		);
		const alertTypeCount = Object.keys(AlertTypes).length;

		expect(clickHereLinks).toHaveLength(alertTypeCount);

		Object.values(AlertTypes).forEach((alertType) => {
			const linkForAlertType = findLinkForAlertType(clickHereLinks, alertType);
			const expectedUrl = ALERT_TYPE_URL_MAP[alertType];

			clickLinkAndVerifyRedirect(linkForAlertType, expectedUrl.selection);
		});

		expect(mockWindowOpen).toHaveBeenCalledTimes(alertTypeCount);
	});

	Object.values(AlertTypes)
		.filter((type) => type !== AlertTypes.ANOMALY_BASED_ALERT)
		.forEach((alertType) => {
			it(`should redirect to create alert page for ${alertType} and "Check an example alert" should redirect to the correct documentation`, () => {
				const { getByTestId, getByRole } = renderResult;

				const alertTypeLink = getByTestId(`alert-type-card-${alertType}`);

				act(() => {
					fireEvent.click(alertTypeLink);
				});

				act(() => {
					fireEvent.click(
						getByRole('button', {
							name: /alert setup guide/i,
						}),
					);
				});

				expect(mockWindowOpen).toHaveBeenCalledWith(
					ALERT_TYPE_URL_MAP[alertType].creation,
					'_blank',
				);
			});
		});
});
