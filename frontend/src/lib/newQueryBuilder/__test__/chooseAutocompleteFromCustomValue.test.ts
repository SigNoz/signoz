import { chooseAutocompleteFromCustomValue } from '../chooseAutocompleteFromCustomValue';
import {
	DataTypes,
	BaseAutocompleteData,
} from '../../../types/api/queryBuilder/queryAutocompleteResponse';

describe('chooseAutocompleteFromCustomValue', () => {
	const source: BaseAutocompleteData[] = [
		{
			id: 'service.name--string--',
			key: 'service.name',
			dataType: DataTypes.String,
			type: '',
		},
		{
			id: 'k8s.cluster.name--string--',
			key: 'k8s.cluster.name',
			dataType: DataTypes.String,
			type: '',
		},
	];

	it('returns existing item when key and dataType match', () => {
		const res = chooseAutocompleteFromCustomValue(
			source,
			'service.name',
			DataTypes.String,
		);
		// It should be the same reference (no recreation)
		expect(res).toBe(source[0]);
	});

	it('creates deterministic non-empty id for custom values', () => {
		const r1 = chooseAutocompleteFromCustomValue([], 'region', 'number');
		const r2 = chooseAutocompleteFromCustomValue([], 'region', 'number');
		expect(r1.id).toBeTruthy();
		expect(r1.id).not.toEqual('----');
		expect(r1.id).toEqual(r2.id);
		expect(r1.key).toEqual('region');
		// "number" maps to Float64 in our normalization
		expect(r1.dataType).toEqual(DataTypes.Float64);
	});

	it('normalizes "number" to Float64', () => {
		const res = chooseAutocompleteFromCustomValue([], 'latency', 'number');
		expect(res.dataType).toEqual(DataTypes.Float64);
	});

	it('uses empty string as default type when fieldType is not provided', () => {
		const res = chooseAutocompleteFromCustomValue([], 'env', DataTypes.String);
		expect(res.type).toEqual('');
	});
});
