import { PlayCircleFilled } from '@ant-design/icons';
import ROUTES from 'constants/routes';
import { liveLogsCompositeQuery } from 'container/LiveLogs/constants';
import LocalTopNav from 'container/LocalTopNav';
import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { LiveButtonStyled } from './styles';

function LogsTopNav(): JSX.Element {
	const history = useHistory();

	const handleGoLive = useCallback(() => {
		const JSONCompositeQuery = encodeURIComponent(
			JSON.stringify(liveLogsCompositeQuery),
		);

		const path = `${ROUTES.LIVE_LOGS}?${JSONCompositeQuery}`;

		history.push(path);
	}, [history]);

	const liveButton = useMemo(
		() => (
			<LiveButtonStyled
				icon={<PlayCircleFilled />}
				onClick={handleGoLive}
				type="primary"
			>
				Go Live
			</LiveButtonStyled>
		),
		[handleGoLive],
	);
	return (
		<LocalTopNav
			actions={liveButton}
			renderPermissions={{ isDateTimeEnabled: true }}
		/>
	);
}

export default LogsTopNav;
