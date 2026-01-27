import { Tooltip } from 'antd';
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

import { RefreshTextContainer } from './styles';

function RefreshText({
	onLastRefreshHandler,
	refreshButtonHidden,
}: RefreshTextProps): JSX.Element {
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
		<RefreshTextContainer refreshButtonHidden={refreshButtonHidden}>
			<Tooltip title={refreshText}>
				<Clock size={12} />
			</Tooltip>
		</RefreshTextContainer>
	);
}

interface RefreshTextProps {
	onLastRefreshHandler: () => string;
	refreshButtonHidden: boolean;
}

export default RefreshText;
