import React, { useEffect, useState } from 'react';

import { RefreshTextContainer, Typography } from './styles';

function RefreshText({ onLastRefreshHandler }: RefreshTextProps): JSX.Element {
	const [refreshText, setRefreshText] = useState<string>('');

	// this is to update the refresh text
	useEffect(() => {
		const interval = setInterval(() => {
			const text = onLastRefreshHandler();
			if (refreshText !== text) {
				setRefreshText(text);
			}
		}, 2000);
		return (): void => {
			clearInterval(interval);
		};
	}, [onLastRefreshHandler, refreshText]);

	return (
		<RefreshTextContainer>
			<Typography>{refreshText}</Typography>
		</RefreshTextContainer>
	);
}

interface RefreshTextProps {
	onLastRefreshHandler: () => string;
}

export default RefreshText;
