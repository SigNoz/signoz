import ROUTES from 'constants/routes';
import CreateAlertPage from 'pages/CreateAlert';
import { MemoryRouter, Route } from 'react-router-dom';
import { act, fireEvent, render } from 'tests/test-utils';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { ALERT_TYPE_URL_MAP } from './constants';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string; search: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.ALERTS_NEW}`,
		search: 'ruleType=anomaly_rule',
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

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));
describe('Anomaly Alert Documentation Redirection', () => {
	let mockWindowOpen: jest.Mock;

	beforeAll(() => {
		mockWindowOpen = jest.fn();
		window.open = mockWindowOpen;
	});

	it('should handle anomaly alert documentation redirection correctly', () => {
		const { getByRole } = render(
			<MemoryRouter initialEntries={['/alerts/new']}>
				<Route path={ROUTES.ALERTS_NEW}>
					<CreateAlertPage />
				</Route>
			</MemoryRouter>,
		);

		const alertType = AlertTypes.ANOMALY_BASED_ALERT;

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
