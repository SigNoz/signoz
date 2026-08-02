import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';

import { Logout } from '../utils';

jest.mock('api/v2/sessions/delete', () => ({
	__esModule: true,
	default: jest.fn().mockResolvedValue({ httpStatusCode: 200, data: null }),
}));

jest.mock('api/browser/localstorage/remove', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('lib/history', () => ({
	__esModule: true,
	default: { push: jest.fn() },
}));

jest.mock('utils/proxyAuthMode', () => ({
	getIsProxyAuthMode: jest.fn(),
	getProxyLogoutUrl: jest.fn(),
}));

// oxlint-disable-next-line typescript/no-require-imports typescript/no-var-requires
const localStorageRemove = require('api/browser/localstorage/remove');
const deleteLocalStorageKey = localStorageRemove.default;
// oxlint-disable-next-line typescript/no-require-imports typescript/no-var-requires
const history = require('lib/history').default;
// oxlint-disable-next-line typescript/no-require-imports typescript/no-var-requires
const proxyAuthMode = require('utils/proxyAuthMode');
const { getIsProxyAuthMode, getProxyLogoutUrl } = proxyAuthMode;

describe('Logout', () => {
	const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

	beforeEach(() => {
		jest.clearAllMocks();
		Object.defineProperty(window, 'location', {
			value: { assign: jest.fn() },
			writable: true,
		});
	});

	it('redirects to the proxy sign-out URL when proxy auth is on and a URL is configured', async () => {
		(getIsProxyAuthMode as jest.Mock).mockReturnValue(true);
		(getProxyLogoutUrl as jest.Mock).mockReturnValue(
			'https://proxy.example.com/logout',
		);

		await Logout();

		expect(window.location.assign).toHaveBeenCalledWith(
			'https://proxy.example.com/logout',
		);
		expect(history.push).not.toHaveBeenCalled();
	});

	it('falls back to /login when proxy auth is on but no URL is configured', async () => {
		(getIsProxyAuthMode as jest.Mock).mockReturnValue(true);
		(getProxyLogoutUrl as jest.Mock).mockReturnValue('');

		await Logout();

		expect(window.location.assign).not.toHaveBeenCalled();
		expect(history.push).toHaveBeenCalledWith(ROUTES.LOGIN);
	});

	it('goes to /login when proxy auth is off even if a URL is somehow set', async () => {
		(getIsProxyAuthMode as jest.Mock).mockReturnValue(false);
		(getProxyLogoutUrl as jest.Mock).mockReturnValue(
			'https://proxy.example.com/logout',
		);

		await Logout();

		expect(window.location.assign).not.toHaveBeenCalled();
		expect(history.push).toHaveBeenCalledWith(ROUTES.LOGIN);
	});

	it('still clears local storage and dispatches LOGOUT on the proxy redirect path', async () => {
		(getIsProxyAuthMode as jest.Mock).mockReturnValue(true);
		(getProxyLogoutUrl as jest.Mock).mockReturnValue(
			'https://proxy.example.com/logout',
		);

		await Logout();

		expect(deleteLocalStorageKey).toHaveBeenCalledWith(LOCALSTORAGE.AUTH_TOKEN);
		expect(deleteLocalStorageKey).toHaveBeenCalledWith(LOCALSTORAGE.IS_LOGGED_IN);
		expect(deleteLocalStorageKey).toHaveBeenCalledWith(
			LOCALSTORAGE.IS_IDENTIFIED_USER,
		);
		expect(deleteLocalStorageKey).toHaveBeenCalledWith(
			LOCALSTORAGE.REFRESH_AUTH_TOKEN,
		);
		expect(deleteLocalStorageKey).toHaveBeenCalledWith(
			LOCALSTORAGE.LOGGED_IN_USER_EMAIL,
		);
		expect(deleteLocalStorageKey).toHaveBeenCalledWith(
			LOCALSTORAGE.LOGGED_IN_USER_NAME,
		);
		expect(deleteLocalStorageKey).toHaveBeenCalledWith(LOCALSTORAGE.CHAT_SUPPORT);
		expect(deleteLocalStorageKey).toHaveBeenCalledWith(LOCALSTORAGE.USER_ID);
		expect(deleteLocalStorageKey).toHaveBeenCalledWith(
			LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT,
		);
		expect(dispatchEventSpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'LOGOUT' }),
		);
	});
});
