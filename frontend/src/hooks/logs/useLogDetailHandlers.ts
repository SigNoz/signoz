import { useCallback, useState } from 'react';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import type { UseActiveLog } from 'hooks/logs/types';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { ILog } from 'types/api/logs/log';

type SelectedTab = typeof VIEW_TYPES[keyof typeof VIEW_TYPES] | undefined;

type UseLogDetailHandlersParams = {
	defaultTab?: SelectedTab;
};

type UseLogDetailHandlersResult = {
	activeLog: UseActiveLog['activeLog'];
	onAddToQuery: UseActiveLog['onAddToQuery'];
	selectedTab: SelectedTab;
	handleSetActiveLog: (log: ILog, selectedTab?: SelectedTab) => void;
	handleCloseLogDetail: () => void;
};

function useLogDetailHandlers({
	defaultTab = VIEW_TYPES.OVERVIEW,
}: UseLogDetailHandlersParams = {}): UseLogDetailHandlersResult {
	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
	} = useActiveLog();
	const [selectedTab, setSelectedTab] = useState<SelectedTab>(defaultTab);

	const handleSetActiveLog = useCallback(
		(log: ILog, nextTab: SelectedTab = defaultTab): void => {
			if (activeLog?.id === log.id) {
				onClearActiveLog();
				setSelectedTab(undefined);
				return;
			}
			onSetActiveLog(log);
			setSelectedTab(nextTab ?? defaultTab);
		},
		[activeLog?.id, defaultTab, onClearActiveLog, onSetActiveLog],
	);

	const handleCloseLogDetail = useCallback((): void => {
		onClearActiveLog();
		setSelectedTab(undefined);
	}, [onClearActiveLog]);

	return {
		activeLog,
		onAddToQuery,
		selectedTab,
		handleSetActiveLog,
		handleCloseLogDetail,
	};
}

export default useLogDetailHandlers;
