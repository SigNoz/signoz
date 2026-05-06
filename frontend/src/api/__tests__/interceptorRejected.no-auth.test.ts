import axios from 'axios';
import { LOCALSTORAGE } from 'constants/localStorage';

import { interceptorRejected } from '../index';

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

describe('interceptorRejected — no-auth mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
	});

	it('does NOT call rotate or Logout when IS_NO_AUTH_MODE=true on 401', async () => {
		localStorage.setItem(LOCALSTORAGE.IS_NO_AUTH_MODE, 'true');

		const error = {
			isAxiosError: true,
			response: {
				status: 401,
				config: { url: '/dashboards', method: 'get' },
			},
			config: { url: '/dashboards', headers: {} },
		};

		await interceptorRejected(error as any).catch(() => {});

		expect(post).not.toHaveBeenCalled();
		expect(Logout).not.toHaveBeenCalled();
	});

	it('DOES attempt rotate when IS_NO_AUTH_MODE=false on 401', async () => {
		localStorage.setItem(LOCALSTORAGE.IS_NO_AUTH_MODE, 'false');
		(post as jest.Mock).mockResolvedValue({
			data: { accessToken: 'a', refreshToken: 'b' },
		});

		const error = {
			isAxiosError: true,
			response: {
				status: 401,
				config: { url: '/dashboards', method: 'get' },
			},
			config: { url: '/dashboards', headers: {} },
		};

		await interceptorRejected(error as any).catch(() => {});

		expect(post).toHaveBeenCalled();
	});
});
