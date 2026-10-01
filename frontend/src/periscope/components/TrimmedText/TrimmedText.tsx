import { useEffect, useState } from 'react';
import { Tooltip } from 'antd';

function TrimmedText({
	text,
	maxCharacters,
}: {
	text: string;
	maxCharacters: number;
}): JSX.Element {
	const [displayText, setDisplayText] = useState(text);

	useEffect(() => {
		if (text.length > maxCharacters) {
			setDisplayText(`${text.slice(0, maxCharacters)}...`);
		} else {
			setDisplayText(text);
		}
	}, [text, maxCharacters]);

	return (
		<Tooltip title={text.length > maxCharacters ? text : undefined}>
			<span>{displayText}</span>
		</Tooltip>
	);
}

export default TrimmedText;
