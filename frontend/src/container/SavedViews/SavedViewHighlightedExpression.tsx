import { useMemo } from 'react';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { highlightQueryExpression } from './utils/highlightQueryExpression';

function SavedViewHighlightedExpression({
	expression,
}: {
	expression: string;
}): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const parts = useMemo(
		() => highlightQueryExpression(expression, isDarkMode),
		[expression, isDarkMode],
	);

	return (
		<>
			{parts.map(({ from, text, color }) =>
				color ? (
					<span key={from} style={{ color }}>
						{text}
					</span>
				) : (
					text
				),
			)}
		</>
	);
}

export default SavedViewHighlightedExpression;
