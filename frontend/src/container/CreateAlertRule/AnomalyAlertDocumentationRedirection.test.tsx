import type { Mock } from 'vitest';
import { MemoryRouter, Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import * as usePrefillAlertConditions from 'container/FormAlertRules/usePrefillAlertConditions';
import CreateAlertPage from 'pages/CreateAlert';
import { act, fireEvent, render } from 'tests/test-utils-full';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { ALERT_TYPE_URL_MAP } from './constants';

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useLocation: (): { pathname: string; search: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.ALERTS_NEW}`,
		search: 'ruleType=anomaly_rule',
	}),
}));

vi.mock('react-router-dom-v5-compat', async () => ({
	...(await vi.importActual('react-router-dom-v5-compat')),
	useNavigationType: vi.fn(() => 'PUSH'),
	useLocation: vi.fn(() => ({
		pathname: '/alerts/new',
		search: 'ruleType=anomaly_rule',
		hash: '',
		state: null,
	})),
	useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
}));

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));

vi.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: vi.fn(),
	}),
}));
// Browser mode has no SSR transform, so a real ESM namespace is frozen and
// `vi.spyOn` on it throws. `vi.mock(..., { spy: true })` routes the module
// through the mocker instead, which works in both environments.
vi.mock('container/FormAlertRules/usePrefillAlertConditions', { spy: true });

vi.mocked(usePrefillAlertConditions.usePrefillAlertConditions).mockReturnValue({
	matchType: '3',
	op: '1',
	target: 100,
	targetUnit: 'rpm',
});

describe('Anomaly Alert Documentation Redirection', () => {
	let mockWindowOpen: Mock;

	beforeAll(() => {
		mockWindowOpen = vi.fn();
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
