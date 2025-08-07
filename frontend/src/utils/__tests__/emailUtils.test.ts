/* eslint-disable sonarjs/no-duplicate-string */
import {
	isValidEmailFormat,
	normalizeEmail,
	processEmail,
} from '../emailUtils';

const TEST_EMAIL = 'johndoe@example.com';
const TEST_DOMAIN_EMAIL = 'user@domain.com';
const ADMIN_EMAIL = 'admin@company.org';
const INVALID_EMAIL = 'invalid-email';
const UPPERCASE_EMAIL = 'JohnDoe@Example.Com';

describe('emailUtils', () => {
	describe('normalizeEmail', () => {
		it('should convert email to lowercase', () => {
			expect(normalizeEmail(UPPERCASE_EMAIL)).toBe(TEST_EMAIL);
			expect(normalizeEmail('ADMIN@COMPANY.ORG')).toBe(ADMIN_EMAIL);
		});

		it('should trim whitespace', () => {
			expect(normalizeEmail('  user@domain.com  ')).toBe(TEST_DOMAIN_EMAIL);
			expect(normalizeEmail('\t user@domain.com \n')).toBe(TEST_DOMAIN_EMAIL);
		});

		it('should handle both trimming and lowercasing', () => {
			expect(normalizeEmail('  JohnDoe@Example.Com  ')).toBe(TEST_EMAIL);
		});

		it('should handle emails that are already normalized', () => {
			expect(normalizeEmail('user@domain.com')).toBe('user@domain.com');
		});
	});

	describe('isValidEmailFormat', () => {
		it('should validate correct email formats', () => {
			expect(isValidEmailFormat('user@domain.com')).toBe(true);
			expect(isValidEmailFormat('john.doe@example.org')).toBe(true);
			expect(isValidEmailFormat('admin+test@company.co.uk')).toBe(true);
		});

		it('should reject invalid email formats', () => {
			expect(isValidEmailFormat(INVALID_EMAIL)).toBe(false);
			expect(isValidEmailFormat('user@')).toBe(false);
			expect(isValidEmailFormat('@domain.com')).toBe(false);
			expect(isValidEmailFormat('user..email@domain.com')).toBe(false);
			expect(isValidEmailFormat('')).toBe(false);
		});

		it('should handle emails with whitespace', () => {
			expect(isValidEmailFormat('  user@domain.com  ')).toBe(true);
			expect(isValidEmailFormat('user @domain.com')).toBe(false);
		});

		it('should return false for invalid inputs', () => {
			expect(isValidEmailFormat('')).toBe(false);
		});
	});

	describe('processEmail', () => {
		it('should normalize and validate valid emails', () => {
			const result = processEmail('JohnDoe@Example.Com');
			expect(result.normalizedEmail).toBe('johndoe@example.com');
			expect(result.isValid).toBe(true);
		});

		it('should normalize and validate invalid emails', () => {
			const result = processEmail('invalid-email');
			expect(result.normalizedEmail).toBe('invalid-email');
			expect(result.isValid).toBe(false);
		});

		it('should handle emails with whitespace', () => {
			const result = processEmail('  User@Domain.Com  ');
			expect(result.normalizedEmail).toBe('user@domain.com');
			expect(result.isValid).toBe(true);
		});

		it('should handle empty input', () => {
			const result = processEmail('');
			expect(result.normalizedEmail).toBe('');
			expect(result.isValid).toBe(false);
		});
	});

	describe('Case-insensitive email scenarios', () => {
		it('should normalize different case variations to the same email', () => {
			const emails = [
				'johndoe@example.com',
				'JohnDoe@example.com',
				'JOHNDOE@EXAMPLE.COM',
				'johnDOE@Example.COM',
				'  JohnDoe@Example.Com  ',
			];

			const normalized = emails.map(normalizeEmail);
			const expected = 'johndoe@example.com';

			normalized.forEach((email) => {
				expect(email).toBe(expected);
			});
		});

		it('should validate all normalized email variations', () => {
			const emails = [
				'JohnDoe@Example.Com',
				'ADMIN@COMPANY.ORG',
				'User.Name@Domain.Co.UK',
			];

			emails.forEach((email) => {
				const { normalizedEmail, isValid } = processEmail(email);
				expect(isValid).toBe(true);
				expect(normalizedEmail).toBe(email.trim().toLowerCase());
			});
		});
	});
});
