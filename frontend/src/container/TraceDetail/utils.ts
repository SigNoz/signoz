/**
 * string is present on the span or not
 */
import { Span } from 'types/api/trace/getTraceItem';

export const filterSpansByString = (
	searchString: string,
	spans: Span[],
): Span[] =>
	spans.filter((span) => {
		const spanWithoutChildren = [...span].slice(0, 10);
		return JSON.stringify(spanWithoutChildren).includes(searchString);
	});
