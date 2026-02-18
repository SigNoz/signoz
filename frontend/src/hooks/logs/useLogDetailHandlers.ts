import { useCallback, useState } from 'react';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import { ILog } from 'types/api/logs/log';

type SelectedTab = typeof VIEW_TYPES[keyof typeof VIEW_TYPES] | undefined;

type UseLogDetailHandlersParams = {
	onSetActiveLog: (log: ILog) => void;
	onClearActiveLog: () => void;
	activeLogId?: string;
	defaultTab?: SelectedTab;
};

type UseLogDetailHandlersResult = {
	selectedTab: SelectedTab;
	handleSetActiveLog: (log: ILog, selectedTab?: SelectedTab) => void;
	handleCloseLogDetail: () => void;
};

function useLogDetailHandlers({
	onSetActiveLog,
	onClearActiveLog,
	activeLogId,
	defaultTab = VIEW_TYPES.OVERVIEW,
}: UseLogDetailHandlersParams): UseLogDetailHandlersResult {
	const [selectedTab, setSelectedTab] = useState<SelectedTab>(defaultTab);

	const handleSetActiveLog = useCallback(
		(log: ILog, nextTab: SelectedTab = defaultTab): void => {
			if (activeLogId === log.id) {
				onClearActiveLog();
				setSelectedTab(undefined);
				return;
			}
			onSetActiveLog(log);
			setSelectedTab(nextTab ?? defaultTab);
		},
		[activeLogId, defaultTab, onClearActiveLog, onSetActiveLog],
	);

	const handleCloseLogDetail = useCallback((): void => {
		onClearActiveLog();
		setSelectedTab(undefined);
	}, [onClearActiveLog]);

	return {
		selectedTab,
		handleSetActiveLog,
		handleCloseLogDetail,
	};
}

export default useLogDetailHandlers;
