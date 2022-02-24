/**
 * string is present on the span or not
 */
import { span } from 'store/actions';

export const filterSpansByString = (
	searchString: string,
	spans: span[],
): span[] =>
	spans.filter((span) => {
		const spanWithoutChildren = [...span].slice(0, 10);
		return JSON.stringify(spanWithoutChildren).includes(searchString);
	});
