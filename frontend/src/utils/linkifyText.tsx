import { Fragment, MouseEvent, ReactNode } from 'react';

/** Matches http(s) URLs and bare www. links up to the next whitespace. */
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s]+)/gi;
/** Trailing punctuation that is almost never part of the intended URL. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

const stopPropagation = (
	event: MouseEvent<HTMLAnchorElement, globalThis.MouseEvent>,
): void => {
	// Prevent parent click listeners (e.g. title edit) from firing.
	event.stopPropagation();
};

/**
 * Splits `text` into plain-text and anchor segments, wrapping any detected
 * URL in an anchor that opens in a new tab. Trailing punctuation is kept
 * outside the link so sentences like "see https://signoz.io." stay clean.
 */
export function linkifyText(text: string): ReactNode {
	if (!text) {
		return text;
	}

	const segments: ReactNode[] = [];
	let lastIndex = 0;
	let key = 0;

	const matches = text.matchAll(URL_REGEX);
	for (const match of matches) {
		const matchStart = match.index ?? 0;
		const rawUrl = match[0];

		const trailing = rawUrl.match(TRAILING_PUNCTUATION)?.[0] ?? '';
		const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
		const href = url.startsWith('www.') ? `https://${url}` : url;

		if (matchStart > lastIndex) {
			segments.push(
				<Fragment key={key}>{text.slice(lastIndex, matchStart)}</Fragment>,
			);
			key += 1;
		}

		segments.push(
			<a
				key={key}
				href={href}
				rel="noopener noreferrer"
				target="_blank"
				onClick={stopPropagation}
			>
				{url}
			</a>,
		);
		key += 1;

		if (trailing) {
			segments.push(<Fragment key={key}>{trailing}</Fragment>);
			key += 1;
		}

		lastIndex = matchStart + rawUrl.length;
	}

	if (lastIndex < text.length) {
		segments.push(<Fragment key={key}>{text.slice(lastIndex)}</Fragment>);
	}

	return segments;
}
