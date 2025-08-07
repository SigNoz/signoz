/**
 * Email utility functions for consistent email handling across the application
 */

/**
 * Normalizes email address to lowercase and trims whitespace
 * This ensures case-insensitive email handling for better UX
 *
 * @param email - The email address to normalize
 * @returns Normalized email address (lowercase and trimmed)
 */
export const normalizeEmail = (email: string): string => {
	if (!email || typeof email !== 'string') {
		return '';
	}

	return email.trim().toLowerCase();
};

/**
 * Validates if the email format is valid (basic validation)
 * @param email - The email address to validate
 * @returns True if email format is valid, false otherwise
 */
export const isValidEmailFormat = (email: string): boolean => {
	if (!email || typeof email !== 'string') {
		return false;
	}

	const trimmedEmail = email.trim();

	// Basic email regex that allows common characters but prevents consecutive dots
	const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;

	// Additional checks for edge cases
	if (
		trimmedEmail.includes('..') ||
		trimmedEmail.startsWith('.') ||
		trimmedEmail.endsWith('.')
	) {
		return false;
	}

	return emailRegex.test(trimmedEmail);
};

/**
 * Normalizes and validates email address
 * @param email - The email address to process
 * @returns Object with normalized email and validation status
 */
export const processEmail = (
	email: string,
): {
	normalizedEmail: string;
	isValid: boolean;
} => {
	const normalizedEmail = normalizeEmail(email);
	const isValid = isValidEmailFormat(normalizedEmail);

	return {
		normalizedEmail,
		isValid,
	};
};
