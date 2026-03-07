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
	selectedRegions,
	setSelectedRegions,
	setIncludeAllRegions,
}: UseRegionSelectionProps): UseRegionSelection {
	const allRegionIds = useMemo(
		() => regions.flatMap((r) => r.subRegions.map((sr) => sr.id)),
		[],
	);
	const handleSelectAll = (checked: boolean): void => {
		setIncludeAllRegions(checked);
		setSelectedRegions(checked ? ['all'] : []);
	};

	const handleRegionSelect = (regionId: string): void => {
		if (selectedRegions.includes('all')) {
			const filteredRegionIds = allRegionIds.filter((id) => id !== regionId);

			setSelectedRegions(filteredRegionIds);
			setIncludeAllRegions(false);
			return;
		}

		setSelectedRegions((prev) => {
			const newSelection = prev.includes(regionId)
				? prev.filter((id) => id !== regionId)
				: [...prev, regionId];

			if (newSelection.length === allRegionIds.length) {
				setIncludeAllRegions(true);
				return ['all'];
			}

			return newSelection;
		});
	};

	return {
		allRegionIds,
		handleSelectAll,
		handleRegionSelect,
	};
}
