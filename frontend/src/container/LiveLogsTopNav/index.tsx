import { PauseCircleFilled, PlayCircleFilled } from '@ant-design/icons';
import LocalTopNav from 'container/LocalTopNav';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useEventSource } from 'providers/EventSource';
import { memo, useCallback, useMemo } from 'react';

import { LiveButtonStyled } from './styles';
import { LiveLogsTopNavProps } from './types';

function LiveLogsTopNav({
	getPreparedQuery,
}: LiveLogsTopNavProps): JSX.Element {
	const {
		isConnectionOpen,
		isConnectionLoading,
		initialLoading,
		handleCloseConnection,
		handleSetInitialLoading,
	} = useEventSource();

	const { redirectWithQueryBuilderData, currentQuery } = useQueryBuilder();

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
			const preparedQuery = getPreparedQuery(currentQuery);
			redirectWithQueryBuilderData(preparedQuery);
		}
	}, [
		initialLoading,
		isConnectionOpen,
		isConnectionLoading,
		currentQuery,
		handleSetInitialLoading,
		handleCloseConnection,
		getPreparedQuery,
		redirectWithQueryBuilderData,
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
