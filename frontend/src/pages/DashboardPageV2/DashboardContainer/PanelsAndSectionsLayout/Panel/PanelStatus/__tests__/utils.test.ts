import type { Warning } from 'types/api';
import APIError from 'types/api/error';
import { StatusCodes } from 'http-status-codes';

import { panelStatusFromError, panelStatusFromWarning } from '../utils';

describe('panelStatusFromError', () => {
	it('returns null when there is no error', () => {
		expect(panelStatusFromError(null)).toBeNull();
	});

	it('maps a structured APIError to code/message/docs/sub-messages', () => {
		const apiError = new APIError({
			httpStatusCode: StatusCodes.BAD_REQUEST,
			error: {
				code: 'invalid_query',
				message: 'Query is invalid',
				url: 'https://docs/err',
				errors: [{ message: 'missing aggregation' }, { message: 'bad filter' }],
			},
		});

		expect(panelStatusFromError(apiError)).toStrictEqual({
			code: 'invalid_query',
			message: 'Query is invalid',
			docsUrl: 'https://docs/err',
			messages: ['missing aggregation', 'bad filter'],
		});
	});

	it('falls back to a generic 500 for a plain Error', () => {
		expect(panelStatusFromError(new Error('boom'))).toStrictEqual({
			code: '500',
			message: 'boom',
			messages: [],
		});
	});

	it('omits docsUrl when the API error has no url', () => {
		const apiError = new APIError({
			httpStatusCode: StatusCodes.INTERNAL_SERVER_ERROR,
			error: { code: 'x', message: 'y', url: '', errors: [] },
		});

		expect(panelStatusFromError(apiError)?.docsUrl).toBeUndefined();
	});
});

describe('panelStatusFromWarning', () => {
	it('returns null when there is no warning', () => {
		expect(panelStatusFromWarning(undefined)).toBeNull();
	});

	it('maps a warning to the normalized status shape', () => {
		const warning: Warning = {
			code: 'partial_data',
			message: 'Some series were dropped',
			url: 'https://docs/warn',
			warnings: [{ message: 'series A truncated' }],
		};

		expect(panelStatusFromWarning(warning)).toStrictEqual({
			code: 'partial_data',
			message: 'Some series were dropped',
			docsUrl: 'https://docs/warn',
			messages: ['series A truncated'],
		});
	});
});
