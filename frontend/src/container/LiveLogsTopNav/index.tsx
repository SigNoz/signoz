import { PauseCircleFilled, PlayCircleFilled } from '@ant-design/icons';
import { Space } from 'antd';
import BackButton from 'container/LiveLogs/BackButton';
import { getQueryWithoutFilterId } from 'container/LiveLogs/utils';
import LocalTopNav from 'container/LocalTopNav';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useEventSource } from 'providers/EventSource';
import { memo, useCallback, useMemo } from 'react';

import { LiveButtonStyled } from './styles';

function LiveLogsTopNav(): JSX.Element {
	const {
		isConnectionOpen,
		isConnectionLoading,
		initialLoading,
		handleCloseConnection,
		handleSetInitialLoading,
	} = useEventSource();

	const { redirectWithQueryBuilderData, currentQuery } = useQueryBuilder();

	const isPlaying = isConnectionOpen || isConnectionLoading || initialLoading;

	const onLiveButtonClick = useCallback(() => {
		if (initialLoading) {
			handleSetInitialLoading(false);
		}

		if ((!isConnectionOpen && isConnectionLoading) || isConnectionOpen) {
			handleCloseConnection();
		} else {
			const preparedQuery = getQueryWithoutFilterId(currentQuery);
			redirectWithQueryBuilderData(preparedQuery);
		}
	}, [
		initialLoading,
		isConnectionOpen,
		isConnectionLoading,
		currentQuery,
		handleSetInitialLoading,
		handleCloseConnection,
		redirectWithQueryBuilderData,
	]);

	const liveButton = useMemo(
		() => (
			<Space size={16}>
				<LiveButtonStyled
					icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
					danger={isPlaying}
					onClick={onLiveButtonClick}
					type="primary"
				>
					{isPlaying ? 'Pause' : 'Resume'}
				</LiveButtonStyled>
				<BackButton />
			</Space>
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
