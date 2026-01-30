import { baseAutoCompleteIdKeysOrder } from 'constants/queryBuilder';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';

import {
	BaseAutocompleteData,
	DataTypes,
} from '../../../types/api/queryBuilder/queryAutocompleteResponse';
import { chooseAutocompleteFromCustomValue } from '../chooseAutocompleteFromCustomValue';

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

	it('same key but different dataType returns new object with computed id', () => {
		// in source, service.name is String; request with number should yield Float64
		const res = chooseAutocompleteFromCustomValue(
			source,
			'service.name',
			'number' as any,
		);
		const expectedId = createIdFromObjectFields(
			{ key: 'service.name', dataType: DataTypes.Float64, type: '' },
			baseAutoCompleteIdKeysOrder,
		);
		expect(res).toEqual(
			expect.objectContaining({
				key: 'service.name',
				dataType: DataTypes.Float64,
				type: '',
				id: expectedId,
			}),
		);
	});

	it('unknown dataType produces object with id from key+unknown+type', () => {
		const res = chooseAutocompleteFromCustomValue(
			[],
			'unknown_key',
			'unknown' as any,
		);
		const expectedId = createIdFromObjectFields(
			{ key: 'unknown_key', dataType: 'unknown' as any, type: '' },
			baseAutoCompleteIdKeysOrder,
		);
		expect(res).toEqual(
			expect.objectContaining({
				key: 'unknown_key',
				dataType: 'unknown',
				type: '',
				id: expectedId,
			}),
		);
	});

	it('undefined dataType defaults to EMPTY and computes id', () => {
		const res = chooseAutocompleteFromCustomValue([], 'undef_key');
		const expectedId = createIdFromObjectFields(
			{ key: 'undef_key', dataType: DataTypes.EMPTY, type: '' },
			baseAutoCompleteIdKeysOrder,
		);
		expect(res).toEqual(
			expect.objectContaining({
				key: 'undef_key',
				dataType: DataTypes.EMPTY,
				type: '',
				id: expectedId,
			}),
		);
	});

	it('uses empty string as default type when fieldType is not provided', () => {
		const res = chooseAutocompleteFromCustomValue([], 'env', DataTypes.String);
		expect(res.type).toEqual('');
	});
});
