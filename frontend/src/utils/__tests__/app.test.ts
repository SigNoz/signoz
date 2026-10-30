import { buildAbsolutePath } from '../app';

// buildAbsolutePath reads getCurrentLocation().pathname (basename-relative) rather than
// window.location.pathname, so we mock lib/router/navigation instead of utils/getLocation.
jest.mock('lib/router/navigation', () => ({
	getCurrentLocation: jest.fn(() => ({ pathname: '/' })),
}));

// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
const { getCurrentLocation } = require('lib/router/navigation') as {
	getCurrentLocation: jest.Mock<{ pathname: string }>;
};

const BASE_PATH = '/some-base-path';

const mockLocation = (pathname: string): void => {
	getCurrentLocation.mockReturnValue({ pathname });
};

describe('buildAbsolutePath', () => {
	describe('when base path ends with a forward slash', () => {
		beforeEach(() => {
			mockLocation(`${BASE_PATH}/`);
		});

		it('should build absolute path without query string', () => {
			const result = buildAbsolutePath({ relativePath: 'users' });
			expect(result).toBe(`${BASE_PATH}/users`);
		});

		it('should build absolute path with query string', () => {
			const result = buildAbsolutePath({
				relativePath: 'users',
				urlQueryString: 'id=123&sort=name',
			});
			expect(result).toBe(`${BASE_PATH}/users?id=123&sort=name`);
		});

		it('should handle nested relative paths', () => {
			const result = buildAbsolutePath({ relativePath: 'users/profile/settings' });
			expect(result).toBe(`${BASE_PATH}/users/profile/settings`);
		});
	});

	describe('when base path does not end with a forward slash', () => {
		beforeEach(() => {
			mockLocation(`${BASE_PATH}`);
		});

		it('should append forward slash and build absolute path', () => {
			const result = buildAbsolutePath({ relativePath: 'users' });
			expect(result).toBe(`${BASE_PATH}/users`);
		});

		it('should append forward slash and build absolute path with query string', () => {
			const result = buildAbsolutePath({
				relativePath: 'users',
				urlQueryString: 'filter=active',
			});
			expect(result).toBe(`${BASE_PATH}/users?filter=active`);
		});
	});

	describe('edge cases', () => {
		it('should handle empty relative path', () => {
			mockLocation(`${BASE_PATH}/`);
			const result = buildAbsolutePath({ relativePath: '' });
			expect(result).toBe(`${BASE_PATH}/`);
		});

		it('should handle query string with empty relative path', () => {
			mockLocation(`${BASE_PATH}/`);
			const result = buildAbsolutePath({
				relativePath: '',
				urlQueryString: 'search=test',
			});
			expect(result).toBe(`${BASE_PATH}/?search=test`);
		});

		it('should preserve pathname without adding trailing slash for empty relative path', () => {
			mockLocation(`${BASE_PATH}`);
			const result = buildAbsolutePath({
				relativePath: '',
				urlQueryString: 'search=test',
			});
			expect(result).toBe(`${BASE_PATH}?search=test`);
		});

		it('should handle relative path starting with forward slash', () => {
			mockLocation(`${BASE_PATH}/`);
			const result = buildAbsolutePath({ relativePath: '/users' });
			expect(result).toBe(`${BASE_PATH}/users`);
		});

		it('should handle complex query strings', () => {
			mockLocation(`${BASE_PATH}/dashboard`);
			const result = buildAbsolutePath({
				relativePath: 'reports',
				urlQueryString: 'date=2024-01-01&type=summary&format=pdf',
			});
			expect(result).toBe(
				`${BASE_PATH}/dashboard/reports?date=2024-01-01&type=summary&format=pdf`,
			);
		});

		it('should handle undefined query string', () => {
			mockLocation(`${BASE_PATH}/`);
			const result = buildAbsolutePath({
				relativePath: 'users',
				urlQueryString: undefined,
			});
			expect(result).toBe(`${BASE_PATH}/users`);
		});

		it('should handle empty query string', () => {
			mockLocation(`${BASE_PATH}/`);
			const result = buildAbsolutePath({
				relativePath: 'users',
				urlQueryString: '',
			});
			expect(result).toBe(`${BASE_PATH}/users`);
		});
	});
});
