import type { MockedFunction } from 'vitest';

import getLocalStorageApi from 'api/browser/localstorage/get';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';
import { getBaseUrl } from 'utils/basePath';

import { getSigNozInstanceUrl } from './signozInstanceUrl';

vi.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: vi.fn(),
}));
vi.mock('constants/env', () => ({
	ENVIRONMENT: { baseURL: '' },
}));
// window.location.origin cannot be redefined in a real browser (§6.5), so the
// origin is driven through the getBaseUrl() seam the unit under test uses.
vi.mock('utils/basePath', async () => {
	const actual =
		await vi.importActual<typeof import('utils/basePath')>('utils/basePath');
	return { ...actual, getBaseUrl: vi.fn(() => 'http://localhost') };
});

const mockedGet = getLocalStorageApi as MockedFunction<
	typeof getLocalStorageApi
>;

function setOrigin(origin: string): void {
	vi.mocked(getBaseUrl).mockReturnValue(origin);
}

describe('getSigNozInstanceUrl', () => {
	beforeEach(() => {
		mockedGet.mockReset();
		vi.mocked(getBaseUrl).mockReset();
		ENVIRONMENT.baseURL = '';
		setOrigin('http://localhost');
	});

	it('returns the localStorage override when present', () => {
		mockedGet.mockReturnValue('https://override.example.com');
		ENVIRONMENT.baseURL = 'https://build.example.com';
		setOrigin('https://browser.example.com');

		expect(getSigNozInstanceUrl()).toBe('https://override.example.com');
		expect(mockedGet).toHaveBeenCalledWith(
			LOCALSTORAGE.ACTIVE_SIGNOZ_INSTANCE_URL,
		);
	});

	it('ignores a blank/whitespace-only override and falls through', () => {
		mockedGet.mockReturnValue('   ');
		ENVIRONMENT.baseURL = 'https://build.example.com';

		expect(getSigNozInstanceUrl()).toBe('https://build.example.com');
	});

	it('returns the build-time baseURL when no override exists (cloud)', () => {
		mockedGet.mockReturnValue(null);
		ENVIRONMENT.baseURL = 'https://build.example.com';
		setOrigin('https://browser.example.com');

		expect(getSigNozInstanceUrl()).toBe('https://build.example.com');
	});

	it('falls back to window.location.origin when baseURL is empty (self-hosted)', () => {
		mockedGet.mockReturnValue(null);
		ENVIRONMENT.baseURL = '';
		setOrigin('https://self-hosted.example.com');

		expect(getSigNozInstanceUrl()).toBe('https://self-hosted.example.com');
	});

	it('returns an empty string when nothing is resolvable', () => {
		mockedGet.mockReturnValue(null);
		ENVIRONMENT.baseURL = '';
		setOrigin('');

		expect(getSigNozInstanceUrl()).toBe('');
	});
});
