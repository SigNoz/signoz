import { DataFormats } from 'constants/formats/types';

import APIError from 'types/api/error';

import { covertIntoDataFormats, getPreviewErrorDetail } from './utils';

describe('Convert One Unit to another unit', () => {
	it('should convert from BitsIEC to BytesIEC', () => {
		const result = covertIntoDataFormats({
			value: 8,
			sourceUnit: DataFormats.BitsIEC,
			targetUnit: DataFormats.BytesIEC,
		});
		expect(result).toBe(1);
	});

	// for KibiBytes to MebiBytes conversion
	it('should convert from KibiBytes to MebiBytes', () => {
		const result = covertIntoDataFormats({
			value: 1024,
			sourceUnit: DataFormats.KibiBytes,
			targetUnit: DataFormats.MebiBytes,
		});
		expect(result).toBe(1);
	});

	// for MegaBytes to GigaBytes conversion (SI units)
	it('should convert from MegaBytes to GigaBytes (SI)', () => {
		const result = covertIntoDataFormats({
			value: 1000,
			sourceUnit: DataFormats.MegaBytes,
			targetUnit: DataFormats.GigaBytes,
		});
		expect(result).toBe(1);
	});

	// for identity conversion
	it('should handle identity conversion', () => {
		const result = covertIntoDataFormats({
			value: 100,
			sourceUnit: DataFormats.KibiBytes,
			targetUnit: DataFormats.KibiBytes,
		});
		expect(result).toBe(100);
	});

	// BytesIEC to BitsIEC conversion
	it('should convert from BytesIEC to BitsIEC', () => {
		const result = covertIntoDataFormats({
			value: 1,
			sourceUnit: DataFormats.BytesIEC,
			targetUnit: DataFormats.BitsIEC,
		});
		expect(result).toBe(8);
	});

	// for GibiBytes to TebiBytes conversion
	it('should convert from GibiBytes to TebiBytes', () => {
		const result = covertIntoDataFormats({
			value: 1024,
			sourceUnit: DataFormats.GibiBytes,
			targetUnit: DataFormats.TebiBytes,
		});
		expect(result).toBe(1);
	});

	// for GigaBytes to TeraBytes conversion (SI units)
	it('should convert from GigaBytes to TeraBytes (SI)', () => {
		const result = covertIntoDataFormats({
			value: 1000,
			sourceUnit: DataFormats.GigaBytes,
			targetUnit: DataFormats.TeraBytes,
		});
		expect(result).toBe(1);
	});

	// for GigaBytes to GibiBytes conversion (cross conversion)
	it('should convert from GigaBytes to GibiBytes', () => {
		const result = covertIntoDataFormats({
			value: 1,
			sourceUnit: DataFormats.GigaBytes,
			targetUnit: DataFormats.GibiBytes,
		});
		// 1 GB = 0.93132257461548 GiB approximately
		expect(result).toBeCloseTo(0.93132257461548);
	});

	//  for a large number conversion
	it('should handle large number conversion from PebiBytes to BitsIEC', () => {
		const result = covertIntoDataFormats({
			value: 1,
			sourceUnit: DataFormats.PebiBytes,
			targetUnit: DataFormats.BitsIEC,
		});
		expect(result).toBe(1 * 1024 ** 5 * 8); // 1 PebiByte = 2^50 Bytes = 2^53 Bits
	});

	// Negative value conversion
	it('should handle negative values', () => {
		const result = covertIntoDataFormats({
			value: -1,
			sourceUnit: DataFormats.KibiBytes,
			targetUnit: DataFormats.BytesIEC,
		});
		expect(result).toBe(-1024);
	});
});

describe('getPreviewErrorDetail', () => {
	it('returns null without an error', () => {
		expect(getPreviewErrorDetail(null)).toBeNull();
	});

	it('maps an API error to the panel status shape', () => {
		const error = new APIError({
			httpStatusCode: 400,
			error: {
				code: 'invalid_input',
				message: 'Found 1 syntax errors while parsing the search expression.',
				url: 'https://signoz.io/docs',
				errors: [{ message: "line 1:21 expecting one of {'(', ')'}" }],
			},
		});

		expect(getPreviewErrorDetail(error)).toStrictEqual({
			code: 'invalid_input',
			message: 'Found 1 syntax errors while parsing the search expression.',
			docsUrl: 'https://signoz.io/docs',
			messages: ["line 1:21 expecting one of {'(', ')'}"],
		});
	});

	it('drops an empty docs url', () => {
		const error = new APIError({
			httpStatusCode: 500,
			error: { code: 'internal', message: 'boom', url: '', errors: [] },
		});

		expect(getPreviewErrorDetail(error)?.docsUrl).toBeUndefined();
	});

	it('falls back to the message of a plain error', () => {
		expect(getPreviewErrorDetail(new Error('Network Error'))).toStrictEqual({
			message: 'Network Error',
			messages: [],
		});
	});
});
