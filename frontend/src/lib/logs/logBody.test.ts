import { getBodyDisplay, getBodyMessage } from './logBody';

describe('getBodyDisplay', () => {
	it('returns a string body as is', () => {
		expect(getBodyDisplay('plain text')).toBe('plain text');
	});

	it('returns the message when it is the only key', () => {
		expect(getBodyDisplay({ message: 'only a message' })).toBe('only a message');
	});

	it('stringifies a non-string message when it is the only key', () => {
		expect(getBodyDisplay({ message: { event: 'login' } as never })).toBe(
			'{"event":"login"}',
		);
	});

	it('stringifies an object with more than the message key', () => {
		expect(getBodyDisplay({ message: 'with fields', level: 'warn' })).toBe(
			'{"message":"with fields","level":"warn"}',
		);
	});

	it('stringifies an object without a message key', () => {
		expect(getBodyDisplay({ event: 'cache_evict' })).toBe(
			'{"event":"cache_evict"}',
		);
	});

	it('returns an empty string for a missing body', () => {
		expect(getBodyDisplay(undefined)).toBe('');
		expect(getBodyDisplay(null)).toBe('');
	});

	it('stringifies a body that is neither a string nor an object', () => {
		expect(getBodyDisplay(42)).toBe('42');
		expect(getBodyDisplay(['a', 1])).toBe('["a",1]');
	});
});

describe('getBodyMessage', () => {
	it('returns a string body as is', () => {
		expect(getBodyMessage('plain text')).toBe('plain text');
	});

	it('prefers the message over the other keys', () => {
		expect(getBodyMessage({ message: 'with fields', level: 'warn' })).toBe(
			'with fields',
		);
	});

	it('stringifies the object when the message is missing or empty', () => {
		expect(getBodyMessage({ event: 'cache_evict' })).toBe(
			'{"event":"cache_evict"}',
		);
		expect(getBodyMessage({ message: '', level: 'warn' })).toBe(
			'{"message":"","level":"warn"}',
		);
	});

	it('collapses a message-only body the same way as getBodyDisplay', () => {
		expect(getBodyMessage({ message: { event: 'login' } as never })).toBe(
			'{"event":"login"}',
		);
		expect(getBodyMessage({ message: '' })).toBe('');
	});

	it('returns an empty string for a missing body', () => {
		expect(getBodyMessage(undefined)).toBe('');
		expect(getBodyMessage(null)).toBe('');
	});
});
