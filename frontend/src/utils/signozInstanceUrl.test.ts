import getLocalStorageApi from 'api/browser/localstorage/get';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';

import { getSigNozInstanceUrl } from './signozInstanceUrl';

jest.mock('api/browser/localstorage/get');
jest.mock('constants/env', () => ({
	ENVIRONMENT: { baseURL: '' },
}));

const mockedGet = getLocalStorageApi as jest.MockedFunction<
	typeof getLocalStorageApi
>;

function setOrigin(origin: string): void {
	Object.defineProperty(window, 'location', {
		value: { origin },
		writable: true,
		configurable: true,
	});
}

describe('getSigNozInstanceUrl', () => {
	beforeEach(() => {
		mockedGet.mockReset();
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
