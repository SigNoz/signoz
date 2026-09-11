import axios from 'axios';
import { getIsNoAuthMode } from 'utils/noAuthMode';
import { markPreflightComplete } from 'utils/preflight';
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

// utils/preflight is deliberately NOT mocked here: the point is the real
// promise, which starts out pending and resolves exactly once. Because it never
// resets, this file holds a single test.
describe('interceptorRejected: preflight gate', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
		(getIsNoAuthMode as jest.Mock).mockReturnValue(false);
		// What a full page load looks like before the global config lands: the
		// singleton still reads its false default even though this deployment is
		// header-authenticated.
		(getIsProxyAuthMode as jest.Mock).mockReturnValue(false);
	});

	// Deciding without waiting reads proxy auth mode as false and rotates. That
	// rotate fails, the failure path logs out, and with logout_redirect_url set
	// the user is sent to the proxy's sign-out page and straight back in, which
	// loops wherever the proxy can re-authenticate silently.
	it('does not rotate when a 401 arrives before preflight has finished', async () => {
		(post as jest.Mock).mockResolvedValue({
			data: { accessToken: 'a', refreshToken: 'b' },
		});

		const settled = interceptorRejected(unauthorized() as any).catch(() => {});

		// Nothing may have happened yet: the interceptor is still waiting.
		expect(post).not.toHaveBeenCalled();

		// Stand in for the preflight effect in providers/App/App.tsx, which sets
		// the flags and then releases the gate.
		(getIsProxyAuthMode as jest.Mock).mockReturnValue(true);
		markPreflightComplete();

		await settled;

		expect(post).not.toHaveBeenCalled();
		expect(Logout).not.toHaveBeenCalled();
	});
});
