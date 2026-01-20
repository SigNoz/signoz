/* eslint-disable sonarjs/no-duplicate-string */
import { ILog } from 'types/api/logs/log';

import { getLogIndicatorType, getLogIndicatorTypeForTable } from './utils';

describe('getLogIndicatorType', () => {
	it('severity_number should be given priority over severity_text', () => {
		const log = {
			date: '2024-02-29T12:34:46Z',
			timestamp: 1646115296,
			id: '123456',
			traceId: '987654',
			spanID: '54321',
			traceFlags: 0,
			severityText: 'INFO',
			severityNumber: 2,
			body: 'Sample log Message',
			resources_string: {},
			attributesString: {},
			scope_string: {},
			attributes_string: {},
			attributesInt: {},
			attributesFloat: {},
			severity_text: 'INFO',
			severity_number: 2,
		};
		// severity_number should get priority over severity_text
		expect(getLogIndicatorType(log)).toBe('TRACE');
	});

	it('severity_text should be used when severity_number is absent ', () => {
		const log = {
			date: '2024-02-29T12:34:46Z',
			timestamp: 1646115296,
			id: '123456',
			traceId: '987654',
			spanID: '54321',
			traceFlags: 0,
			severityText: 'INFO',
			severityNumber: 2,
			body: 'Sample log Message',
			resources_string: {},
			attributesString: {},
			scope_string: {},
			attributes_string: {},
			attributesInt: {},
			attributesFloat: {},
			severity_text: 'FATAL',
			severity_number: 0,
		};
		expect(getLogIndicatorType(log)).toBe('FATAL');
	});

	it('case insensitive severity_text should be valid', () => {
		const log = {
			date: '2024-02-29T12:34:46Z',
			timestamp: 1646115296,
			id: '123456',
			traceId: '987654',
			spanID: '54321',
			traceFlags: 0,
			severityText: 'INFO',
			severityNumber: 2,
			body: 'Sample log Message',
			resources_string: {},
			attributesString: {},
			scope_string: {},
			attributes_string: {},
			attributesInt: {},
			attributesFloat: {},
			severity_text: 'fatAl',
			severity_number: 0,
		};
		expect(getLogIndicatorType(log)).toBe('FATAL');
	});

	it('should return log level if severityText and severityNumber is missing', () => {
		const log: ILog = {
			date: '2024-02-29T12:34:58Z',
			timestamp: 1646115296,
			id: '123456',
			traceId: '987654',
			spanID: '54321',
			traceFlags: 0,
			severityNumber: 2,
			body: 'Sample log',
			resources_string: {},
			attributesString: {},
			scope_string: {},
			attributes_string: {
				log_level: 'INFO' as never,
			},
			attributesInt: {},
			attributesFloat: {},
			severity_text: 'some_random',
			severityText: '',
			severity_number: 0,
		};
		expect(getLogIndicatorType(log)).toBe('INFO');
	});
});

describe('getLogIndicatorTypeForTable', () => {
	it('should return severity type for valid log with severityText', () => {
		const log = {
			date: '2024-02-29T12:34:56Z',
			timestamp: 1646115296,
			id: '123456',
			traceId: '987654',
			spanID: '54321',
			traceFlags: 0,
			severityNumber: 2,
			severity_number: 2,
			body: 'Sample log message',
			resources_string: {},
			attributesString: {},
			attributes_string: {},
			attributesInt: {},
			scope_string: {},
			attributesFloat: {},
			severity_text: 'WARN',
		};
		expect(getLogIndicatorTypeForTable(log)).toBe('TRACE');
	});

	it('should return log level if severityText is missing', () => {
		const log = {
			date: '2024-02-29T12:34:56Z',
			timestamp: 1646115296,
			id: '123456',
			traceId: '987654',
			spanID: '54321',
			traceFlags: 0,
			severityNumber: 0,
			severity_number: 0,
			body: 'Sample log message',
			resources_string: {},
			scope_string: {},
			attributesString: {},
			attributes_string: {},
			attributesInt: {},
			attributesFloat: {},
			log_level: 'INFO',
		};
		expect(getLogIndicatorTypeForTable(log)).toBe('INFO');
	});
});

describe('logIndicatorBySeverityNumber', () => {
	// https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
	const logLevelExpectations = [
		{ minSevNumber: 1, maxSevNumber: 4, expectedIndicatorType: 'TRACE' },
		{ minSevNumber: 5, maxSevNumber: 8, expectedIndicatorType: 'DEBUG' },
		{ minSevNumber: 9, maxSevNumber: 12, expectedIndicatorType: 'INFO' },
		{ minSevNumber: 13, maxSevNumber: 16, expectedIndicatorType: 'WARN' },
		{ minSevNumber: 17, maxSevNumber: 20, expectedIndicatorType: 'ERROR' },
		{ minSevNumber: 21, maxSevNumber: 24, expectedIndicatorType: 'FATAL' },
	];
	logLevelExpectations.forEach((e) => {
		for (let sevNum = e.minSevNumber; sevNum <= e.maxSevNumber; sevNum++) {
			const sevText = (Math.random() + 1).toString(36).substring(2);

			const log = {
				date: '2024-02-29T12:34:46Z',
				timestamp: 1646115296,
				id: '123456',
				traceId: '987654',
				spanID: '54321',
				traceFlags: 0,
				severityText: sevText,
				severityNumber: sevNum,
				body: 'Sample log Message',
				resources_string: {},
				attributesString: {},
				scope_string: {},
				attributes_string: {},
				attributesInt: {},
				attributesFloat: {},
				severity_text: sevText,
				severity_number: sevNum,
			};

			it(`getLogIndicatorType should return ${e.expectedIndicatorType} for severity_text: ${sevText} and severity_number: ${sevNum}`, () => {
				expect(getLogIndicatorType(log)).toBe(e.expectedIndicatorType);
			});

			it(`getLogIndicatorTypeForTable should return ${e.expectedIndicatorType} for severity_text: ${sevText} and severity_number: ${sevNum}`, () => {
				expect(getLogIndicatorTypeForTable(log)).toBe(e.expectedIndicatorType);
			});
		}
	});
});
