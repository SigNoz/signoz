import logEvent from 'api/common/logEvent';
import updateCustomFiltersAPI from 'api/quickFilters/updateCustomFilters';
import axios, { AxiosError } from 'axios';
import { SignalType } from 'components/QuickFilters/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useNotifications } from 'hooks/useNotifications';
import { useCallback, useState } from 'react';
import { useMutation } from 'react-query';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

interface UseQuickFilterSettingsProps {
	setIsSettingsOpen: (isSettingsOpen: boolean) => void;
	customFilters: FilterType[];
	refetchCustomFilters: () => void;
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
	debouncedInputValue: string;
	handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const useQuickFilterSettings = ({
	customFilters,
	setIsSettingsOpen,
	refetchCustomFilters,
	signal,
}: UseQuickFilterSettingsProps): UseQuickFilterSettingsReturn => {
	const [inputValue, setInputValue] = useState<string>('');
	const [debouncedInputValue, setDebouncedInputValue] = useState<string>('');
	const [addedFilters, setAddedFilters] = useState<FilterType[]>(customFilters);
	const { notifications } = useNotifications();

	const {
		mutate: updateCustomFilters,
		isLoading: isUpdatingCustomFilters,
	} = useMutation(updateCustomFiltersAPI, {
		onSuccess: () => {
			setIsSettingsOpen(false);
			refetchCustomFilters();
			logEvent('Quick Filters Settings: changes saved', {
				addedFilters,
			});
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
	const debouncedUpdate = useDebouncedFn((value) => {
		setDebouncedInputValue(value as string);
	}, 400);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const value = e.target.value.trim().toLowerCase();
			setInputValue(value);
			debouncedUpdate(value);
		},
		[debouncedUpdate],
	);

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
		debouncedInputValue,
		handleInputChange,
	};
};

export default useQuickFilterSettings;
