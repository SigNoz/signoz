import { useCallback, useEffect } from 'react';
import { Button } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useEventSource } from 'providers/EventSource';
import { validateQuery } from 'utils/queryValidationUtils';
import { CirclePause, CirclePlay } from '@signozhq/icons';

function LiveLogsPauseResume(): JSX.Element {
	const {
		isConnectionOpen,
		isConnectionLoading,
		initialLoading,
		handleCloseConnection,
		handleStartOpenConnection,
		handleSetInitialLoading,
	} = useEventSource();

	const { currentQuery } = useQueryBuilder();

	const isPlaying = isConnectionOpen || isConnectionLoading || initialLoading;

	const openConnection = useCallback(
		(filterExpression?: string | null) => {
			handleStartOpenConnection(filterExpression || '');
		},
		[handleStartOpenConnection],
	);

	const handleStartNewConnection = useCallback(
		(filterExpression?: string | null) => {
			handleCloseConnection();

			openConnection(filterExpression);
		},
		[handleCloseConnection, openConnection],
	);

	const onLiveButtonClick = useCallback(() => {
		if (initialLoading) {
			handleSetInitialLoading(false);
		}

		if ((!isConnectionOpen && isConnectionLoading) || isConnectionOpen) {
			handleCloseConnection();
		} else {
			const currentFilterExpression =
				currentQuery?.builder.queryData[0]?.filter?.expression?.trim() || '';

			const validationResult = validateQuery(currentFilterExpression || '');

			if (validationResult.isValid) {
				handleStartNewConnection(currentFilterExpression);
			} else {
				handleStartNewConnection(null);
			}
		}
	}, [
		initialLoading,
		isConnectionOpen,
		isConnectionLoading,
		currentQuery,
		handleSetInitialLoading,
		handleCloseConnection,
		handleStartNewConnection,
	]);

	// clean up the connection when the component unmounts
	useEffect(
		() => (): void => {
			handleCloseConnection();
		},
		[handleCloseConnection],
	);

	return (
		<div className="live-logs-pause-resume">
			<Button
				icon={isPlaying ? <CirclePause size="md" /> : <CirclePlay size="md" />}
				danger={isPlaying}
				onClick={onLiveButtonClick}
				type="primary"
				className={`periscope-btn ${isPlaying ? 'warning' : 'success'}`}
			>
				{isPlaying ? 'Pause' : 'Resume'}
			</Button>
		</div>
	);
}

export default LiveLogsPauseResume;
