import type { Mock } from 'vitest';

import axios from 'axios';
import post from 'api/v2/sessions/rotate/post';
import { getIsNoAuthMode } from 'utils/noAuthMode';

import { Logout } from '../utils';
import { interceptorRejected } from '../index';

vi.mock('utils/noAuthMode', () => ({
	getIsNoAuthMode: vi.fn(),
}));

vi.mock('api/v2/sessions/rotate/post', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('AppRoutes/utils', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('../utils', () => ({
	Logout: vi.fn(),
}));

describe('interceptorRejected — no-auth mode', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
	});

	it('does NOT call rotate or Logout when no-auth mode is enabled on 401', async () => {
		vi.mocked(getIsNoAuthMode).mockReturnValue(true);

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

	it('DOES attempt rotate when no-auth mode is disabled on 401', async () => {
		vi.mocked(getIsNoAuthMode).mockReturnValue(false);
		(post as unknown as Mock).mockResolvedValue({
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
