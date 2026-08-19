import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { SignalType } from 'components/QuickFilters/types';

import { SIGNAL_DATA_SOURCE_MAP } from '../constants';
import {
	DATA_SOURCE_TO_SIGNAL,
	mapFieldKeysToFilters,
	mapMeterFieldKeysToFilters,
} from '../utils';

describe('DATA_SOURCE_TO_SIGNAL', () => {
	it.each([
		[SignalType.LOGS, TelemetrytypesSignalDTO.logs],
		[SignalType.TRACES, TelemetrytypesSignalDTO.traces],
		[SignalType.EXCEPTIONS, TelemetrytypesSignalDTO.traces],
		[SignalType.API_MONITORING, TelemetrytypesSignalDTO.traces],
		[SignalType.METER_EXPLORER, TelemetrytypesSignalDTO.metrics],
	])('maps %s to the %s signal', (signal, expected) => {
		expect(DATA_SOURCE_TO_SIGNAL[SIGNAL_DATA_SOURCE_MAP[signal]]).toBe(expected);
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

describe('mapMeterFieldKeysToFilters', () => {
	it('returns an empty list when there are no keys', () => {
		expect(mapMeterFieldKeysToFilters(undefined)).toStrictEqual([]);
	});

	it('keeps the raw field context, which carries the metric aggregation', () => {
		const filters = mapMeterFieldKeysToFilters({
			'service.name': [
				{
					name: 'service.name',
					fieldContext: 'attribute',
					fieldDataType: 'string',
				},
			],
			'signoz.metric.name': [
				{
					name: 'signoz.metric.name',
					fieldContext: 'metric',
					fieldDataType: 'float64',
				},
			],
		} as never);

		expect(filters).toStrictEqual([
			{ key: 'service.name', dataType: 'string', type: 'attribute' },
			{ key: 'signoz.metric.name', dataType: 'float64', type: 'metric' },
		]);
	});

	it('narrows the number data type so the save is not rejected', () => {
		const filters = mapMeterFieldKeysToFilters({
			'http.status_code': [
				{
					name: 'http.status_code',
					fieldContext: 'attribute',
					fieldDataType: 'number',
				},
			],
		} as never);

		expect(filters).toStrictEqual([
			{ key: 'http.status_code', dataType: 'float64', type: 'attribute' },
		]);
	});

	it('falls back to unspecified for missing context and data type', () => {
		expect(
			mapMeterFieldKeysToFilters({ custom: [{ name: 'custom' }] } as never),
		).toStrictEqual([{ key: 'custom', dataType: '', type: '' }]);
	});
});
