import {
	emptyVariableFormModel,
	type VariableFormModel,
	type VariableType,
} from '../../variableFormModel';
import { detectVariableCycle } from '../variableCycleDetection';

function variable(
	name: string,
	type: VariableType,
	queryValue = '',
): VariableFormModel {
	return { ...emptyVariableFormModel(), name, type, queryValue };
}

describe('detectVariableCycle', () => {
	it('returns null for an empty variable set', () => {
		expect(detectVariableCycle([])).toBeNull();
	});

	it('returns null when no variable references another', () => {
		const variables = [
			variable('region', 'QUERY', 'SELECT region FROM t'),
			variable('service', 'QUERY', 'SELECT service FROM t'),
		];

		expect(detectVariableCycle(variables)).toBeNull();
	});

	it('returns null for an acyclic chain', () => {
		const variables = [
			variable('region', 'QUERY', 'SELECT region FROM t'),
			variable('cluster', 'QUERY', 'SELECT cluster WHERE region = $region'),
			variable('pod', 'QUERY', 'SELECT pod WHERE cluster = $cluster'),
		];

		expect(detectVariableCycle(variables)).toBeNull();
	});

	it('detects a direct two-variable cycle', () => {
		const variables = [
			variable('a', 'QUERY', 'SELECT a WHERE b = $b'),
			variable('b', 'QUERY', 'SELECT b WHERE a = $a'),
		];

		const cycle = detectVariableCycle(variables);

		expect(cycle).not.toBeNull();
		expect(cycle).toStrictEqual(expect.arrayContaining(['a', 'b']));
	});

	it('detects a transitive three-variable cycle', () => {
		const variables = [
			variable('a', 'QUERY', 'SELECT a WHERE c = $c'),
			variable('b', 'QUERY', 'SELECT b WHERE a = $a'),
			variable('c', 'QUERY', 'SELECT c WHERE b = $b'),
		];

		const cycle = detectVariableCycle(variables);

		expect(cycle).not.toBeNull();
		expect(cycle).toStrictEqual(expect.arrayContaining(['a', 'b', 'c']));
	});

	it('detects a self-referencing variable', () => {
		const variables = [variable('a', 'QUERY', 'SELECT a WHERE a = $a')];

		expect(detectVariableCycle(variables)).not.toBeNull();
	});

	// Only QUERY variables can form a dependency — a CUSTOM variable's value is
	// static text, so a `$ref` inside it never creates an edge.
	it('ignores references from non-QUERY variables', () => {
		const variables = [
			variable('a', 'QUERY', 'SELECT a WHERE b = $b'),
			{ ...variable('b', 'CUSTOM'), customValue: '$a' },
		];

		expect(detectVariableCycle(variables)).toBeNull();
	});

	it('skips variables with no name', () => {
		const variables = [
			variable('', 'QUERY', 'SELECT x'),
			variable('a', 'QUERY', 'SELECT a'),
		];

		expect(detectVariableCycle(variables)).toBeNull();
	});
});
