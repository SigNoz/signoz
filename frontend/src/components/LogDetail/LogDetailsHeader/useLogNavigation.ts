import { useCallback, useMemo } from 'react';
import { ILog } from 'types/api/logs/log';

interface UseLogNavigationParams {
	logs?: ILog[];
	activeLogId: string;
	onNavigateLog?: (log: ILog) => void;
	onScrollToLog?: (id: string) => void;
}

interface UseLogNavigationReturn {
	goToPrev: () => void;
	goToNext: () => void;
	isPrevDisabled: boolean;
	isNextDisabled: boolean;
}

export function useLogNavigation({
	logs,
	activeLogId,
	onNavigateLog,
	onScrollToLog,
}: UseLogNavigationParams): UseLogNavigationReturn {
	const currentIndex = useMemo(
		() => logs?.findIndex((l) => l.id === activeLogId) ?? -1,
		[logs, activeLogId],
	);

	const canNavigate = !!logs?.length && !!onNavigateLog && currentIndex !== -1;
	const isPrevDisabled = !canNavigate || currentIndex <= 0;
	const isNextDisabled = !canNavigate || currentIndex >= (logs?.length ?? 0) - 1;

	const goToPrev = useCallback((): void => {
		if (isPrevDisabled || !logs) {
			return;
		}
		const prev = logs[currentIndex - 1];
		onNavigateLog?.(prev);
		onScrollToLog?.(prev.id);
	}, [isPrevDisabled, logs, currentIndex, onNavigateLog, onScrollToLog]);

	const goToNext = useCallback((): void => {
		if (isNextDisabled || !logs) {
			return;
		}
		const next = logs[currentIndex + 1];
		onNavigateLog?.(next);
		onScrollToLog?.(next.id);
	}, [isNextDisabled, logs, currentIndex, onNavigateLog, onScrollToLog]);

	return { goToPrev, goToNext, isPrevDisabled, isNextDisabled };
}
