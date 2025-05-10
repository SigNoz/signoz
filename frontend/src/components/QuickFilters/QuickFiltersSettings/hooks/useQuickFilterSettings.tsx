import updateCustomFiltersAPI from 'api/quickFilters/updateCustomFilters';
import { AxiosError } from 'axios';
import { SignalType } from 'components/QuickFilters/types';
import { useCallback, useState } from 'react';
import { useMutation } from 'react-query';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

interface UseQuickFilterSettingsProps {
	setIsSettingsOpen: (isSettingsOpen: boolean) => void;
	customFilters: FilterType[];
	setIsStale: (isStale: boolean) => void;
	signal?: SignalType;
}

interface UseQuickFilterSettingsReturn {
	addedFilters: FilterType[];
	setAddedFilters: React.Dispatch<React.SetStateAction<FilterType[]>>;
	handleSettingsClose: () => void;
	handleDiscardChanges: () => void;
	handleSaveChanges: () => void;
	isUpdatingCustomFilters: boolean;
}

const useQuickFilterSettings = ({
	customFilters,
	setIsSettingsOpen,
	setIsStale,
	signal,
}: UseQuickFilterSettingsProps): UseQuickFilterSettingsReturn => {
	const [addedFilters, setAddedFilters] = useState<FilterType[]>(customFilters);

	const {
		mutate: updateCustomFilters,
		isLoading: isUpdatingCustomFilters,
	} = useMutation(updateCustomFiltersAPI, {
		onSuccess: () => {
			// set isStale to true
			// close settings
			setIsStale(true);
			// display success toast
		},
		onError: (error: AxiosError) => {
			console.error('>>>>error', error);
			// display error toast
			// close settings
		},
	});

	const handleSettingsClose = useCallback((): void => {
		setIsSettingsOpen(false);
	}, [setIsSettingsOpen]);

	const handleDiscardChanges = useCallback((): void => {
		setAddedFilters(customFilters);
	}, [customFilters, setAddedFilters]);

	const handleSaveChanges = useCallback((): void => {
		if (signal) {
			updateCustomFilters({
				data: {
					filters: addedFilters.map((filter) => ({
						key: filter.key,
						datatype: filter.dataType,
						type: filter.type,
					})),
					signal,
				},
			});
		}
	}, [addedFilters, signal, updateCustomFilters]);

	return {
		handleSettingsClose,
		handleDiscardChanges,
		addedFilters,
		setAddedFilters,
		handleSaveChanges,
		isUpdatingCustomFilters,
	};
};

export default useQuickFilterSettings;
