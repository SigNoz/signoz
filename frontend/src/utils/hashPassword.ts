/**
 * Hashes a password client-side (SHA-256) before it is sent to the backend.
 *
 * This does NOT add real protection beyond TLS -- the hash becomes the new
 * secret sent over the wire, and an active MITM capable of intercepting the
 * request could just as easily modify this script to skip hashing entirely.
 * TLS + HSTS remain the actual controls against network-level exposure.
 * This exists to satisfy an explicit bank compliance requirement.
 */
export async function hashPassword(password: string): Promise<string> {
	const encoded = new TextEncoder().encode(password);
	const digest = await crypto.subtle.digest('SHA-256', encoded);

	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}
