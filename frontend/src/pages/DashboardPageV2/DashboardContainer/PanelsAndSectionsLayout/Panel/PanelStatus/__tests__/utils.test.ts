import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import type { AxiosError } from 'axios';
import type { Querybuildertypesv5QueryWarnDataDTO as WarningDTO } from 'api/generated/services/sigNoz.schemas';
import { StatusCodes } from 'http-status-codes';

import { panelStatusFromError, panelStatusFromWarning } from '../utils';

// The query layer rejects with the raw AxiosError from the generated client
// (it is not pre-converted to APIError), so the tests mirror that wire shape.
function axiosErrorWith(
	error: RenderErrorResponseDTO['error'],
	status: number = StatusCodes.BAD_REQUEST,
): AxiosError<RenderErrorResponseDTO> {
	return {
		response: { status, data: { error } },
	} as AxiosError<RenderErrorResponseDTO>;
}

describe('panelStatusFromError', () => {
	it('returns null when there is no error', () => {
		expect(panelStatusFromError(null)).toBeNull();
	});

	it('maps a structured API error to code/message/docs/sub-messages', () => {
		const error = axiosErrorWith({
			code: 'invalid_query',
			message: 'Query is invalid',
			url: 'https://docs/err',
			errors: [
				{ message: 'missing aggregation', suggestions: [] },
				{ message: 'bad filter', suggestions: [] },
			],
			suggestions: [],
			type: '',
		});

		expect(panelStatusFromError(error)).toStrictEqual({
			code: 'invalid_query',
			message: 'Query is invalid',
			docsUrl: 'https://docs/err',
			messages: ['missing aggregation', 'bad filter'],
		});
	});

	it('falls back to the error message when there is no structured body', () => {
		expect(panelStatusFromError(new Error('boom'))).toStrictEqual({
			code: 'unknown_error',
			message: 'boom',
			docsUrl: undefined,
			messages: [],
		});
	});

	it('omits docsUrl when the API error has no url', () => {
		const error = axiosErrorWith(
			{
				code: 'x',
				message: 'y',
				url: '',
				errors: [],
				suggestions: [],
				type: '',
			},
			StatusCodes.INTERNAL_SERVER_ERROR,
		);

		expect(panelStatusFromError(error)?.docsUrl).toBeUndefined();
	});
});

describe('panelStatusFromWarning', () => {
	it('returns null when there is no warning', () => {
		expect(panelStatusFromWarning(undefined)).toBeNull();
	});

	it('maps a warning to the normalized status shape (no code — V5 warnings carry none)', () => {
		const warning: WarningDTO = {
			message: 'Some series were dropped',
			url: 'https://docs/warn',
			warnings: [{ message: 'series A truncated' }],
		};

		expect(panelStatusFromWarning(warning)).toStrictEqual({
			message: 'Some series were dropped',
			docsUrl: 'https://docs/warn',
			messages: ['series A truncated'],
		});
	});
});
