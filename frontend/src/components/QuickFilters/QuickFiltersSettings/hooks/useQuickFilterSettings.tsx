import { useState } from 'react';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

interface UseQuickFilterSettingsProps {
	setIsSettingsOpen: (isSettingsOpen: boolean) => void;
}

interface UseQuickFilterSettingsReturn {
	customFilters: FilterType[];
	setCustomFilters: React.Dispatch<React.SetStateAction<FilterType[]>>;
	handleSettingsClose: () => void;
}

const useQuickFilterSettings = ({
	setIsSettingsOpen,
}: UseQuickFilterSettingsProps): UseQuickFilterSettingsReturn => {
	const [customFilters, setCustomFilters] = useState<FilterType[]>([]);

	const handleSettingsClose = (): void => {
		setIsSettingsOpen(false);
	};

	return {
		customFilters,
		setCustomFilters,
		handleSettingsClose,
	};
};

export default useQuickFilterSettings;
