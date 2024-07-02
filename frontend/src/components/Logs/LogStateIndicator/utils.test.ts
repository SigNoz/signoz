import { ILog } from 'types/api/logs/log';

import { getLogIndicatorType, getLogIndicatorTypeForTable } from './utils';

describe('getLogIndicatorType', () => {
	it('should return severity type for valid log with severity_number', () => {
		const log = {
			date: '2024-02-29T12:34:46Z',
			timestamp: 1646115296,
			id: '123456',
			traceId: '987654',
			spanId: '54321',
			traceFlags: 0,
			severityText: 'INFO',
			severityNumber: 2,
			body: 'Sample log Message',
			resources_string: {},
			attributesString: {},
			attributes_string: {},
			attributesInt: {},
			attributesFloat: {},
			severity_text: 'INFO',
			severity_number: 9,
		};
		expect(getLogIndicatorType(log)).toBe('INFO');
	});

	it('should return log level if severity_number is out of spec range', () => {
		const log: ILog = {
			date: '2024-02-29T12:34:58Z',
			timestamp: 1646115296,
			id: '123456',
			traceId: '987654',
			spanId: '54321',
			traceFlags: 0,
			severityNumber: 2,
			body: 'Sample log',
			resources_string: {},
			attributesString: {},
			attributes_string: {},
			attributesInt: {},
			attributesFloat: {},
			severity_text: 'FATAL',
			severity_number: 0,
			severityText: '',
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
			spanId: '54321',
			traceFlags: 0,
			severity_number: 13,
			body: 'Sample log message',
			resources_string: {},
			attributesString: {},
			attributes_string: {},
			attributesInt: {},
			attributesFloat: {},
			severity_text: 'WARN',
		};
		expect(getLogIndicatorTypeForTable(log)).toBe('WARN');
	});

	it('should return log level if severity_number is out of spec range', () => {
		const log = {
			date: '2024-02-29T12:34:56Z',
			timestamp: 1646115296,
			id: '123456',
			traceId: '987654',
			spanId: '54321',
			traceFlags: 0,
			severityNumber: 0,
			body: 'Sample log message',
			resources_string: {},
			attributesString: {},
			attributes_string: {},
			attributesInt: {},
			attributesFloat: {},
			log_level: 'FATAL',
		};
		expect(getLogIndicatorTypeForTable(log)).toBe('FATAL');
	});
});
