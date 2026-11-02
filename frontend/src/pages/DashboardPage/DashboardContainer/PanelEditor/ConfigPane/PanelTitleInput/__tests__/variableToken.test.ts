import { findVariableToken, insertVariable } from '../variableToken';

describe('findVariableToken', () => {
	it('finds the token being typed before the cursor', () => {
		expect(findVariableToken('Latency of $ser', 15)).toStrictEqual({
			start: 11,
			query: 'ser',
		});
	});

	it('matches a bare `$`', () => {
		expect(findVariableToken('by $', 4)).toStrictEqual({ start: 3, query: '' });
	});

	it('ignores a token the cursor has moved past', () => {
		expect(findVariableToken('$env in prod', 12)).toBeNull();
	});
});

describe('insertVariable', () => {
	it('replaces the whole token, including text after the cursor', () => {
		const token = { start: 4, query: 'ser' };
		expect(
			insertVariable('p99 $service_x for', token, 'service.name'),
		).toStrictEqual({
			text: 'p99 $service.name for',
			cursor: 17,
		});
	});
});
