import { Dispatch, SetStateAction, useMemo } from 'react';
import { regions } from 'utils/regions';

interface UseRegionSelectionProps {
	selectedRegions: string[];
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
}

interface UseRegionSelection {
	allRegionIds: string[];
	handleSelectAll: (checked: boolean) => void;
	handleRegionSelect: (regionId: string) => void;
}

export function useRegionSelection({
	setSelectedRegions,
	setIncludeAllRegions,
}: UseRegionSelectionProps): UseRegionSelection {
	const allRegionIds = useMemo(
		() => regions.flatMap((r) => r.subRegions.map((sr) => sr.id)),
		[],
	);
	const handleSelectAll = (checked: boolean): void => {
		setIncludeAllRegions(checked);
		setSelectedRegions(checked ? allRegionIds : []);
	};

	const handleRegionSelect = (regionId: string): void => {
		setSelectedRegions((prev) => {
			const normalizedPrev = prev.includes('all') ? allRegionIds : prev;
			const newSelection = normalizedPrev.includes(regionId)
				? normalizedPrev.filter((id) => id !== regionId)
				: [...normalizedPrev, regionId];

			if (newSelection.length === allRegionIds.length) {
				setIncludeAllRegions(true);
				return allRegionIds;
			}

			setIncludeAllRegions(false);
			return newSelection;
		});
	};

	return {
		allRegionIds,
		handleSelectAll,
		handleRegionSelect,
	};
}
