import { Tooltip } from 'antd';
import { useEffect, useState } from 'react';

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

	return text.length > maxCharacters ? (
		<Tooltip title={text}>
			<span>{displayText}</span>
		</Tooltip>
	) : (
		<span>{displayText}</span>
	);
}

export default TrimmedText;
