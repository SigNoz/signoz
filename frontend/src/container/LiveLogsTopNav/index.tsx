import { PauseCircleFilled, PlayCircleFilled } from '@ant-design/icons';
import LocalTopNav from 'container/LocalTopNav';
import { useEventSource } from 'providers/EventSource';
import { memo, useCallback, useMemo } from 'react';

import { LiveButtonStyled } from './styles';
import { LiveLogsTopNavProps } from './types';

function LiveLogsTopNav({
	onOpenConnection,
}: LiveLogsTopNavProps): JSX.Element {
	const {
		isConnectionOpen,
		isConnectionLoading,
		initialLoading,
		handleCloseConnection,
		handleSetInitialLoading,
	} = useEventSource();

	const isPlaying = useMemo(
		() => isConnectionOpen || isConnectionLoading || initialLoading,
		[isConnectionOpen, isConnectionLoading, initialLoading],
	);

	const onLiveButtonClick = useCallback(() => {
		if (initialLoading) {
			handleSetInitialLoading(false);
		}

		if ((!isConnectionOpen && isConnectionLoading) || isConnectionOpen) {
			handleCloseConnection();
		} else {
			onOpenConnection();
		}
	}, [
		initialLoading,
		isConnectionOpen,
		isConnectionLoading,
		handleSetInitialLoading,
		handleCloseConnection,
		onOpenConnection,
	]);

	const liveButton = useMemo(
		() => (
			<LiveButtonStyled
				icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
				danger={isPlaying}
				onClick={onLiveButtonClick}
				type="primary"
			>
				{isPlaying ? 'Pause' : 'Resume'}
			</LiveButtonStyled>
		),
		[isPlaying, onLiveButtonClick],
	);

	return (
		<LocalTopNav
			actions={liveButton}
			renderPermissions={{ isDateTimeEnabled: false }}
		/>
	);
}

export default memo(LiveLogsTopNav);
