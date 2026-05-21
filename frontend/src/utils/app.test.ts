import { checkVersionState } from './app';

describe('checkVersionState', () => {
	it('returns true when both versions match exactly', () => {
		expect(checkVersionState('0.76.2', '0.76.2')).toBe(true);
	});

	it('returns true when current version has a leading "v" and latest does not', () => {
		expect(checkVersionState('v0.76.2', '0.76.2')).toBe(true);
	});

	it('returns true when latest version has a leading "v" and current does not', () => {
		expect(checkVersionState('0.76.2', 'v0.76.2')).toBe(true);
	});

	it('returns true when both versions have a leading "v"', () => {
		expect(checkVersionState('v0.76.2', 'v0.76.2')).toBe(true);
	});

	it('treats pre-release suffix on current as equivalent to the core version', () => {
		expect(checkVersionState('v0.76.2-rc.1', '0.76.2')).toBe(true);
	});

	it('returns false for different versions regardless of prefix', () => {
		expect(checkVersionState('v0.76.1', '0.76.2')).toBe(false);
		expect(checkVersionState('0.76.1', 'v0.76.2')).toBe(false);
	});
});
