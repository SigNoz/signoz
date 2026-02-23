import { useCallback } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';

type UseScrollToLogParams = {
	logs: Array<{ id: string }>;
	virtuosoRef: React.RefObject<VirtuosoHandle | null>;
};

function useScrollToLog({
	logs,
	virtuosoRef,
}: UseScrollToLogParams): (logId: string) => void {
	return useCallback(
		(logId: string): void => {
			const logIndex = logs.findIndex(({ id }) => id === logId);
			if (logIndex !== -1 && virtuosoRef.current) {
				virtuosoRef.current.scrollToIndex({
					index: logIndex,
					align: 'center',
					behavior: 'smooth',
				});
			}
		},
		[logs, virtuosoRef],
	);
}

export default useScrollToLog;
