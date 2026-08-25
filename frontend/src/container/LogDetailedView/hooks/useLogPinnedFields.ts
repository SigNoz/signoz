import { useCallback, useMemo } from 'react';
import { useMutation } from 'react-query';
import updateUserPreferenceAPI from 'api/v1/user/preferences/name/update';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { useAppContext } from 'providers/App/App';

interface UseLogPinnedFieldsReturn {
	value: string[];
	onChange: (next: string[]) => void;
}

/**
 * Reads/writes log-details pinned attributes from the user preference
 * `log_details_pinned_attributes` (cross-device sync).
 */
export function useLogPinnedFields(): UseLogPinnedFieldsReturn {
	const { userPreferences, updateUserPreferenceInContext } = useAppContext();
	const { mutate } = useMutation(updateUserPreferenceAPI);

	const value = useMemo<string[]>(() => {
		const pref = userPreferences?.find(
			(p) => p.name === USER_PREFERENCES.LOG_DETAILS_PINNED_ATTRIBUTES,
		);
		return (pref?.value as string[] | undefined) ?? [];
	}, [userPreferences]);

	const onChange = useCallback(
		(next: string[]) => {
			const existing = userPreferences?.find(
				(p) => p.name === USER_PREFERENCES.LOG_DETAILS_PINNED_ATTRIBUTES,
			);
			if (existing) {
				updateUserPreferenceInContext({ ...existing, value: next });
			}
			mutate({
				name: USER_PREFERENCES.LOG_DETAILS_PINNED_ATTRIBUTES,
				value: next,
			});
		},
		[userPreferences, updateUserPreferenceInContext, mutate],
	);

	return { value, onChange };
}
