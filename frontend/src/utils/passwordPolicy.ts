/**
 * Mirrors the complexity rules previously enforced server-side in
 * pkg/types/factor_password.go (IsPasswordValid). Now that the backend only
 * ever sees a SHA-256 hash of the password (see utils/hashPassword.ts), it
 * can no longer validate the raw password's complexity -- this check must
 * happen here, on the raw password, before it is hashed.
 */
const MIN_PASSWORD_LENGTH = 12;
const SYMBOLS = /[~!@#$%^&*()_+`\-={}|[\]\\:"<>?,./]/;

export const PASSWORD_POLICY_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long, and contain at least one uppercase letter, one lowercase letter, one number, and one symbol.`;

export function isPasswordComplex(password: string): boolean {
	if (password.length < MIN_PASSWORD_LENGTH) {
		return false;
	}

	const hasUpperCase = /[A-Z]/.test(password);
	const hasLowerCase = /[a-z]/.test(password);
	const hasNumber = /[0-9]/.test(password);
	const hasSymbol = SYMBOLS.test(password);

	return hasUpperCase && hasLowerCase && hasNumber && hasSymbol;
}
