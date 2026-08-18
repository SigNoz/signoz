import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { SignalType } from 'components/QuickFilters/types';

import { getFieldKeysSignal, mapFieldKeysToFilters } from '../utils';

describe('getFieldKeysSignal', () => {
	it.each([
		[SignalType.LOGS, TelemetrytypesSignalDTO.logs],
		[SignalType.TRACES, TelemetrytypesSignalDTO.traces],
		[SignalType.EXCEPTIONS, TelemetrytypesSignalDTO.traces],
		[SignalType.API_MONITORING, TelemetrytypesSignalDTO.traces],
	])('maps %s to the %s signal', (signal, expected) => {
		expect(getFieldKeysSignal(signal)).toBe(expected);
	});
});

describe('mapFieldKeysToFilters', () => {
	it('returns an empty list when there are no keys', () => {
		expect(mapFieldKeysToFilters(undefined)).toStrictEqual([]);
		expect(mapFieldKeysToFilters(null)).toStrictEqual([]);
	});

	it('maps field contexts to v3 attribute types', () => {
		const filters = mapFieldKeysToFilters({
			'service.name': [
				{ name: 'service.name', fieldContext: 'resource', fieldDataType: 'string' },
			],
			'http.method': [
				{ name: 'http.method', fieldContext: 'attribute', fieldDataType: 'string' },
			],
			body: [{ name: 'body', fieldContext: 'body', fieldDataType: 'string' }],
		} as never);

		expect(filters).toStrictEqual([
			{ key: 'service.name', dataType: 'string', type: 'resource' },
			{ key: 'http.method', dataType: 'string', type: 'tag' },
			{ key: 'body', dataType: 'string', type: '' },
		]);
	});

	it('narrows the number data type, which v3 attribute keys do not support', () => {
		const filters = mapFieldKeysToFilters({
			'http.status_code': [
				{
					name: 'http.status_code',
					fieldContext: 'attribute',
					fieldDataType: 'number',
				},
			],
		} as never);

		expect(filters).toStrictEqual([
			{ key: 'http.status_code', dataType: 'float64', type: 'tag' },
		]);
	});

	it('keeps the first entry when a key exists under multiple contexts', () => {
		const filters = mapFieldKeysToFilters({
			'service.name': [
				{ name: 'service.name', fieldContext: 'resource', fieldDataType: 'string' },
				{
					name: 'service.name',
					fieldContext: 'attribute',
					fieldDataType: 'string',
				},
			],
		} as never);

		expect(filters).toStrictEqual([
			{ key: 'service.name', dataType: 'string', type: 'resource' },
		]);
	});

	it('falls back to unspecified for missing context and data type', () => {
		const filters = mapFieldKeysToFilters({
			custom: [{ name: 'custom' }],
		} as never);

		expect(filters).toStrictEqual([{ key: 'custom', dataType: '', type: '' }]);
	});
});
