import axios from 'axios';
import { getIsNoAuthMode } from 'utils/noAuthMode';
import { getIsProxyAuthMode } from 'utils/proxyAuthMode';

import { interceptorRejected } from '../index';

jest.mock('utils/noAuthMode', () => ({
	getIsNoAuthMode: jest.fn(),
}));

jest.mock('utils/proxyAuthMode', () => ({
	getIsProxyAuthMode: jest.fn(),
}));

jest.mock('api/v2/sessions/rotate/post', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('AppRoutes/utils', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('../utils', () => ({
	Logout: jest.fn(),
}));

// oxlint-disable-next-line typescript/no-require-imports typescript/no-var-requires
const post = require('api/v2/sessions/rotate/post').default;
// oxlint-disable-next-line typescript/no-require-imports typescript/no-var-requires
const { Logout } = require('../utils');

const unauthorized = (): unknown => ({
	isAxiosError: true,
	response: {
		status: 401,
		config: { url: '/dashboards', method: 'get' },
	},
	config: { url: '/dashboards', headers: {} },
});

describe('interceptorRejected: sessionless auth modes', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
		(getIsNoAuthMode as jest.Mock).mockReturnValue(false);
		(getIsProxyAuthMode as jest.Mock).mockReturnValue(false);
	});

	it('does NOT call rotate or Logout when no-auth mode is enabled on 401', async () => {
		(getIsNoAuthMode as jest.Mock).mockReturnValue(true);

		await interceptorRejected(unauthorized() as any).catch(() => {});

		expect(post).not.toHaveBeenCalled();
		expect(Logout).not.toHaveBeenCalled();
	});

	// There is no session to rotate under proxy auth, and Logout would send the
	// user to the proxy's sign-out page and straight back in.
	it('does NOT call rotate or Logout when proxy auth mode is enabled on 401', async () => {
		(getIsProxyAuthMode as jest.Mock).mockReturnValue(true);

		await interceptorRejected(unauthorized() as any).catch(() => {});

		expect(post).not.toHaveBeenCalled();
		expect(Logout).not.toHaveBeenCalled();
	});

	it('DOES attempt rotate when neither mode is enabled on 401', async () => {
		(post as jest.Mock).mockResolvedValue({
			data: { accessToken: 'a', refreshToken: 'b' },
		});

		await interceptorRejected(unauthorized() as any).catch(() => {});

		expect(post).toHaveBeenCalled();
	});
});
