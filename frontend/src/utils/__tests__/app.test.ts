import { buildAbsolutePath } from '../app';

const BASE_URL = 'http://localhost';

describe('buildAbsolutePath', () => {
	const orginalLocation = window.location;

	afterEach(() => {
		Object.defineProperty(window, 'location', {
			writable: true,
			value: orginalLocation,
		});
	});

	const mockLocation = (pathname: string): void => {
		Object.defineProperty(window, 'location', {
			writable: true,
			value: {
				pathname,
				href: `${BASE_URL}${pathname}`,
				origin: BASE_URL,
				protocol: 'http:',
				host: 'localhost',
				hostname: 'localhost',
				port: '',
				search: '',
				hash: '',
			},
		});
	};

	describe('when base path ends with a forward slash', () => {
		beforeEach(() => {
			mockLocation(`${BASE_URL}/`);
		});

		it('should build absolute path without query string', () => {
			const result = buildAbsolutePath({ relativePath: 'users' });
			expect(result).toBe(`${BASE_URL}/users`);
		});

		it('should build absolute path with query string', () => {
			const result = buildAbsolutePath({
				relativePath: 'users',
				urlQueryString: 'id=123&sort=name',
			});
			expect(result).toBe(`${BASE_URL}/users?id=123&sort=name`);
		});

		it('should handle nested relative paths', () => {
			const result = buildAbsolutePath({ relativePath: 'users/profile/settings' });
			expect(result).toBe(`${BASE_URL}/users/profile/settings`);
		});
	});

	describe('when base path does not end with a forward slash', () => {
		beforeEach(() => {
			mockLocation('http://localhost');
		});

		it('should append forward slash and build absolute path', () => {
			const result = buildAbsolutePath({ relativePath: 'users' });
			expect(result).toBe(`${BASE_URL}/users`);
		});

		it('should append forward slash and build absolute path with query string', () => {
			const result = buildAbsolutePath({
				relativePath: 'users',
				urlQueryString: 'filter=active',
			});
			expect(result).toBe(`${BASE_URL}/users?filter=active`);
		});
	});

	describe('edge cases', () => {
		it('should handle empty relative path', () => {
			mockLocation(`${BASE_URL}/`);
			const result = buildAbsolutePath({ relativePath: '' });
			expect(result).toBe(`${BASE_URL}/`);
		});

		it('should handle query string with empty relative path', () => {
			mockLocation(`${BASE_URL}/`);
			const result = buildAbsolutePath({
				relativePath: '',
				urlQueryString: 'search=test',
			});
			expect(result).toBe(`${BASE_URL}/?search=test`);
		});

		it('should handle relative path starting with forward slash', () => {
			mockLocation(`${BASE_URL}/`);
			const result = buildAbsolutePath({ relativePath: '/users' });
			expect(result).toBe(`${BASE_URL}/users`);
		});

		it('should handle complex query strings', () => {
			mockLocation(`${BASE_URL}/dashboard`);
			const result = buildAbsolutePath({
				relativePath: 'reports',
				urlQueryString: 'date=2024-01-01&type=summary&format=pdf',
			});
			expect(result).toBe(
				`${BASE_URL}/dashboard/reports?date=2024-01-01&type=summary&format=pdf`,
			);
		});

		it('should handle undefined query string', () => {
			mockLocation(`${BASE_URL}/`);
			const result = buildAbsolutePath({
				relativePath: 'users',
				urlQueryString: undefined,
			});
			expect(result).toBe(`${BASE_URL}/users`);
		});

		it('should handle empty query string', () => {
			mockLocation(`${BASE_URL}/`);
			const result = buildAbsolutePath({
				relativePath: 'users',
				urlQueryString: '',
			});
			expect(result).toBe(`${BASE_URL}/users`);
		});
	});
});
