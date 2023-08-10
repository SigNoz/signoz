import { PauseCircleFilled, PlayCircleFilled } from '@ant-design/icons';
import LocalTopNav from 'container/LocalTopNav';
import { useEventSource } from 'providers/EventSource';
import { useMemo } from 'react';

import { LiveButtonStyled } from './styles';

function LiveLogsTopNav(): JSX.Element {
	const { isConnectionOpen, isConnectionLoading } = useEventSource();

	const isPaused = useMemo(() => isConnectionOpen || isConnectionLoading, [
		isConnectionOpen,
		isConnectionLoading,
	]);

	const liveButton = useMemo(
		() => (
			<LiveButtonStyled
				loading={isConnectionLoading}
				icon={isPaused ? <PauseCircleFilled /> : <PlayCircleFilled />}
				danger={isPaused}
				type="primary"
			>
				{isPaused ? 'Pause' : 'Resume'}
			</LiveButtonStyled>
		),
		[isPaused, isConnectionLoading],
	);

	return (
		<LocalTopNav
			actions={liveButton}
			renderPermissions={{ isDateTimeEnabled: false }}
		/>
	);
}

export default LiveLogsTopNav;
