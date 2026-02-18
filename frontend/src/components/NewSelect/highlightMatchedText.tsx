import React from 'react';

/**
 * Highlights matched search text in a string. Used for option list search highlighting.
 */
export function highlightMatchedText(
	text: string,
	searchQuery: string,
	highlightSearch: boolean,
): React.ReactNode {
	if (!searchQuery || !highlightSearch) {
		return text;
	}
	try {
		const parts = text.split(
			new RegExp(
				`(${searchQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`,
				'gi',
			),
		);
		return (
			<>
				{parts.map((part, i) => {
					const uniqueKey = `${text.substring(0, 3)}-${part.substring(0, 3)}-${i}`;
					return part.toLowerCase() === searchQuery.toLowerCase() ? (
						<span key={uniqueKey} className="highlight-text">
							{part}
						</span>
					) : (
						part
					);
				})}
			</>
		);
	} catch {
		return text;
	}
}
