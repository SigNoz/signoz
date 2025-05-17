import updateCustomFiltersAPI from 'api/quickFilters/updateCustomFilters';
import axios, { AxiosError } from 'axios';
import { SignalType } from 'components/QuickFilters/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useNotifications } from 'hooks/useNotifications';
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
	inputValue: string;
	setInputValue: React.Dispatch<React.SetStateAction<string>>;
}

const useQuickFilterSettings = ({
	customFilters,
	setIsSettingsOpen,
	setIsStale,
	signal,
}: UseQuickFilterSettingsProps): UseQuickFilterSettingsReturn => {
	const [inputValue, setInputValue] = useState<string>('');
	const [addedFilters, setAddedFilters] = useState<FilterType[]>(customFilters);
	const { notifications } = useNotifications();

	const {
		mutate: updateCustomFilters,
		isLoading: isUpdatingCustomFilters,
	} = useMutation(updateCustomFiltersAPI, {
		onSuccess: () => {
			setIsSettingsOpen(false);
			setIsStale(true);
			notifications.success({
				message: 'Quick filters updated successfully',
				placement: 'bottomRight',
			});
		},
		onError: (error: AxiosError) => {
			notifications.error({
				message: axios.isAxiosError(error) ? error.message : SOMETHING_WENT_WRONG,
				placement: 'bottomRight',
			});
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
		inputValue,
		setInputValue,
	};
};

export default useQuickFilterSettings;
