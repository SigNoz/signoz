import {
	ROLE_PERMISSIONS_MODEL_PATH,
	shouldProvideCompletions,
} from '../jsonSchema.config';

describe('shouldProvideCompletions', () => {
	const validPath = `/some/path/${ROLE_PERMISSIONS_MODEL_PATH}`;
	const invalidPath = '/some/other/file.json';

	describe('model path validation', () => {
		it('returns false when model path does not end with ROLE_PERMISSIONS_MODEL_PATH', () => {
			expect(shouldProvideCompletions(invalidPath, '[')).toBe(false);
		});

		it('returns true when model path ends with ROLE_PERMISSIONS_MODEL_PATH and at array position', () => {
			expect(shouldProvideCompletions(validPath, '[')).toBe(true);
		});
	});

	describe('cursor position validation', () => {
		it('returns true when cursor is after opening bracket', () => {
			expect(shouldProvideCompletions(validPath, '[')).toBe(true);
		});

		it('returns true when cursor is after comma at root level', () => {
			expect(shouldProvideCompletions(validPath, '[{},\n')).toBe(true);
		});

		it('returns true with whitespace before bracket', () => {
			expect(shouldProvideCompletions(validPath, '  \n  [')).toBe(true);
		});

		it('returns true with whitespace before comma', () => {
			expect(shouldProvideCompletions(validPath, '[{}  ,  ')).toBe(true);
		});

		it('returns false when cursor is in middle of text', () => {
			expect(shouldProvideCompletions(validPath, '[{"foo"')).toBe(false);
		});

		it('returns false when cursor is after closing bracket', () => {
			expect(shouldProvideCompletions(validPath, '[]')).toBe(false);
		});

		it('returns false when cursor is after colon', () => {
			expect(shouldProvideCompletions(validPath, '[{"key":')).toBe(false);
		});
	});

	describe('brace depth validation', () => {
		it('returns false when cursor is inside an object', () => {
			expect(shouldProvideCompletions(validPath, '[{')).toBe(false);
		});

		it('returns false when cursor is inside nested object', () => {
			const text = '[{"objectGroup": {"resource": {';
			expect(shouldProvideCompletions(validPath, text)).toBe(false);
		});

		it('returns true when all objects are closed and at comma', () => {
			const text = '[{"objectGroup": {"resource": {}}}],';
			expect(shouldProvideCompletions(validPath, text)).toBe(true);
		});

		it('returns true after complete object with comma', () => {
			const text = `[{
  "objectGroup": {
    "resource": { "kind": "dashboard", "type": "object" },
    "selectors": ["*"]
  },
  "relation": "read"
},`;
			expect(shouldProvideCompletions(validPath, text)).toBe(true);
		});

		it('returns false inside partial object after comma', () => {
			const text = `[{
  "objectGroup": {
    "resource": { "kind": "dashboard", "type": "object" },`;
			expect(shouldProvideCompletions(validPath, text)).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('handles empty string', () => {
			expect(shouldProvideCompletions(validPath, '')).toBe(false);
		});

		it('handles only whitespace', () => {
			expect(shouldProvideCompletions(validPath, '   \n\t  ')).toBe(false);
		});

		it('handles unbalanced braces (more closing) - no completions for malformed JSON', () => {
			expect(shouldProvideCompletions(validPath, '[{}}},')).toBe(false);
		});
	});
});
