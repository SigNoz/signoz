import { ILogBody } from 'types/api/logs/log';
import { coerceToString } from 'utils/stringUtils';

function isBodyObject(body: unknown): body is ILogBody {
	return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function extractOnlyMessageBody(body: unknown): unknown {
	if (!isBodyObject(body)) {
		return body;
	}
	const keys = Object.keys(body);
	if (keys.length === 1 && keys[0] === 'message') {
		const { message } = body;
		return typeof message === 'string' ? message : JSON.stringify(message);
	}
	return body;
}

export function getBodyDisplay(body: unknown): string {
	return coerceToString(extractOnlyMessageBody(body));
}

export function getBodyMessage(body: unknown): string {
	if (!isBodyObject(body)) {
		return coerceToString(body);
	}
	if (typeof body.message === 'string' && body.message !== '') {
		return body.message;
	}
	return JSON.stringify(body);
}
