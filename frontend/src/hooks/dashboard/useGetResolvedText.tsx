import { ReactNode, useMemo } from 'react';

interface UseGetResolvedTextProps {
	text: string | ReactNode;
	maxLength?: number;
}

interface ResolvedTextResult {
	fullText: string | ReactNode;
	truncatedText: string | ReactNode;
}

/**
 * Returns a panel title alongside a copy truncated to `maxLength`, so a card can
 * show the short form and keep the full string for its tooltip. Non-string content
 * passes through untouched.
 */
function useGetResolvedText({
	text,
	maxLength,
}: UseGetResolvedTextProps): ResolvedTextResult {
	const truncatedText = useMemo(() => {
		if (typeof text !== 'string' || !maxLength || text.length <= maxLength) {
			return text;
		}
		return `${text.substring(0, maxLength - 3)}...`;
	}, [text, maxLength]);

	return { fullText: text, truncatedText };
}

export default useGetResolvedText;
