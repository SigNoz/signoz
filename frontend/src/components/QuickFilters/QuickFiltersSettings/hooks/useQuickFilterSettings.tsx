import { useCallback, useMemo, useState } from 'react';
import { useUpdateQuickFilters } from 'api/generated/services/quick-filter';
import logEvent from 'api/common/logEvent';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SignalType } from 'components/QuickFilters/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useNotifications } from 'hooks/useNotifications';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

interface UseQuickFilterSettingsProps {
	setIsSettingsOpen: (isSettingsOpen: boolean) => void;
	customFilters: TelemetryFieldKey[];
	refetchCustomFilters: () => void;
	signal?: SignalType;
}

interface UseQuickFilterSettingsReturn {
	addedFilters: TelemetryFieldKey[];
	setAddedFilters: React.Dispatch<React.SetStateAction<TelemetryFieldKey[]>>;
	handleSettingsClose: () => void;
	handleDiscardChanges: () => void;
	handleSaveChanges: () => void;
	hasUnsavedChanges: boolean;
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
	const normalizedCustomFilters = useMemo<TelemetryFieldKey[]>(
		() =>
			customFilters.map((filter) => ({
				...filter,
				key: buildCompositeKey(
					filter.name,
					filter.fieldContext,
					filter.fieldDataType,
				),
			})),
		[customFilters],
	);
	const [addedFilters, setAddedFilters] = useState<TelemetryFieldKey[]>(
		normalizedCustomFilters,
	);
	const { notifications } = useNotifications();

	const { mutate: updateCustomFilters, isLoading: isUpdatingCustomFilters } =
		useUpdateQuickFilters({
			mutation: {
				onSuccess: () => {
					setIsSettingsOpen(false);
					refetchCustomFilters();
					void logEvent('Quick Filters Settings: changes saved', {
						addedFilters,
					});
					notifications.success({
						message: 'Quick filters updated successfully',
						placement: 'bottomRight',
					});
				},
				onError: (error) => {
					notifications.error({
						message: error.message || SOMETHING_WENT_WRONG,
						placement: 'bottomRight',
					});
				},
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
		setAddedFilters(normalizedCustomFilters);
	}, [normalizedCustomFilters, setAddedFilters]);

	const hasUnsavedChanges = useMemo(
		() =>
			!(
				addedFilters.length === normalizedCustomFilters.length &&
				addedFilters.every(
					(filter, index) => filter.key === normalizedCustomFilters[index].key,
				)
			),
		[addedFilters, normalizedCustomFilters],
	);

	const handleSaveChanges = useCallback((): void => {
		if (signal) {
			updateCustomFilters({
				data: {
					// Send only the stored TelemetryFieldKey fields; the composite `key`
					// is UI-only.
					filters: addedFilters.map((filter) => ({
						name: filter.name,
						fieldContext: filter.fieldContext as TelemetrytypesFieldContextDTO,
						fieldDataType: filter.fieldDataType as TelemetrytypesFieldDataTypeDTO,
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
		hasUnsavedChanges,
		isUpdatingCustomFilters,
		inputValue,
		setInputValue,
		debouncedInputValue,
		handleInputChange,
	};
};

export default useQuickFilterSettings;
