import { useEffect } from 'react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import { liveLogsCompositeQuery } from 'container/LiveLogs/constants';
import LiveLogsContainer from 'container/LiveLogs/LiveLogsContainer';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { DataSource } from 'types/common/queryBuilder';

interface LiveLogsProps {
	handleChangeSelectedView?: ChangeViewFunctionType;
}

function LiveLogs({ handleChangeSelectedView }: LiveLogsProps): JSX.Element {
	useShareBuilderUrl({ defaultValue: liveLogsCompositeQuery });
	const { handleSetConfig } = useQueryBuilder();

	useEffect(() => {
		handleSetConfig(PANEL_TYPES.LIST, DataSource.LOGS);
	}, [handleSetConfig]);

	return (
		<LiveLogsContainer handleChangeSelectedView={handleChangeSelectedView} />
	);
}

LiveLogs.defaultProps = {
	handleChangeSelectedView: undefined,
};

export default LiveLogs;
