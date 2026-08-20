import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { SignalType } from 'components/QuickFilters/types';

import { SIGNAL_DATA_SOURCE_MAP } from '../constants';
import {
	DATA_SOURCE_TO_SIGNAL,
	getFilterId,
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

	it('maps array data types rather than dropping them', () => {
		const filters = mapFieldKeysToFilters({
			'http.request.header': [
				{
					name: 'http.request.header',
					fieldContext: 'attribute',
					fieldDataType: '[]string',
				},
			],
		} as never);

		expect(filters).toStrictEqual([
			{ key: 'http.request.header', dataType: 'array(string)', type: 'tag' },
		]);
	});

	it('returns one filter per context when a key exists under multiple contexts', () => {
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
			{ key: 'service.name', dataType: 'string', type: 'tag' },
		]);
	});

	it('dedupes variants whose contexts map to the same v3 type', () => {
		const filters = mapFieldKeysToFilters({
			body: [
				{ name: 'body', fieldContext: 'body', fieldDataType: 'string' },
				{ name: 'body', fieldContext: 'log', fieldDataType: 'string' },
			],
		} as never);

		expect(filters).toStrictEqual([
			{ key: 'body', dataType: 'string', type: '' },
		]);
	});

	it('falls back to unspecified for missing context and data type', () => {
		const filters = mapFieldKeysToFilters({
			custom: [{ name: 'custom' }],
		} as never);

		expect(filters).toStrictEqual([{ key: 'custom', dataType: '', type: '' }]);
	});
});

describe('getFilterId', () => {
	it('disambiguates the same name across types', () => {
		expect(getFilterId({ key: 'service.name', type: 'resource' })).toBe(
			'resource:service.name',
		);
		expect(getFilterId({ key: 'service.name', type: 'tag' })).toBe(
			'tag:service.name',
		);
	});

	it('falls back to the bare name without a type', () => {
		expect(getFilterId({ key: 'body', type: '' })).toBe('body');
		expect(getFilterId({ key: 'body' })).toBe('body');
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
