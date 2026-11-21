import { useCallback, useState } from 'react';
import {
	getSavedTimeRanges,
	removeSavedTimeRange,
	renameSavedTimeRange,
	SavedTimeRange,
	saveTimeRange,
} from 'utils/savedTimeRangeUtils';

type TimeRangeBounds = Pick<SavedTimeRange, 'from' | 'to'>;

interface UseSavedTimeRanges {
	savedTimeRanges: SavedTimeRange[];
	save: (range: SavedTimeRange) => void;
	rename: (range: TimeRangeBounds, name: string) => void;
	remove: (range: TimeRangeBounds) => void;
}

function useSavedTimeRanges(): UseSavedTimeRanges {
	const [savedTimeRanges, setSavedTimeRanges] =
		useState<SavedTimeRange[]>(getSavedTimeRanges);

	const save = useCallback((range: SavedTimeRange): void => {
		setSavedTimeRanges(saveTimeRange(range));
	}, []);

	const rename = useCallback((range: TimeRangeBounds, name: string): void => {
		setSavedTimeRanges(renameSavedTimeRange(range, name));
	}, []);

	const remove = useCallback((range: TimeRangeBounds): void => {
		setSavedTimeRanges(removeSavedTimeRange(range));
	}, []);

	return { savedTimeRanges, save, rename, remove };
}

export default useSavedTimeRanges;
