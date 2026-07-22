import { useCallback, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { createUser } from 'api/generated/services/users';
import { cloneDeep, debounce } from 'lodash-es';
import { EMAIL_REGEX } from 'utils/app';
import { getBaseUrl } from 'utils/basePath';
import { v4 as uuid } from 'uuid';

import {
	InviteMemberRow,
	InviteResult,
	UseInviteMembersOptions,
	UseInviteMembersReturn,
} from './types';

const createEmptyRow = (): InviteMemberRow => ({
	id: uuid(),
	email: '',
	roleId: '',
});

const isRowTouched = (row: InviteMemberRow): boolean =>
	row.email.trim() !== '' || row.roleId !== '';

export function useInviteMembers(
	options: UseInviteMembersOptions = {},
): UseInviteMembersReturn {
	const {
		initialRowCount = 3,
		onSuccess,
		onPartialSuccess,
		onAllFailed,
	} = options;

	const [rows, setRows] = useState<InviteMemberRow[]>(() =>
		Array.from({ length: initialRowCount }, () => createEmptyRow()),
	);
	const [emailValidity, setEmailValidity] = useState<Record<string, boolean>>(
		{},
	);
	const [hasInvalidEmails, setHasInvalidEmails] = useState(false);
	const [hasInvalidRoles, setHasInvalidRoles] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [inviteResults, setInviteResults] = useState<InviteResult[] | null>(
		null,
	);

	const touchedRows = useMemo(() => rows.filter(isRowTouched), [rows]);

	const failedResults = useMemo(
		() => inviteResults?.filter((r) => !r.success) ?? [],
		[inviteResults],
	);

	const successResults = useMemo(
		() => inviteResults?.filter((r) => r.success) ?? [],
		[inviteResults],
	);

	const debouncedValidateEmail = useMemo(
		() =>
			debounce((email: string, rowId: string) => {
				const isValid = EMAIL_REGEX.test(email);
				setEmailValidity((prev) => ({ ...prev, [rowId]: isValid }));
			}, 500),
		[],
	);

	const validateAllRows = useCallback((): boolean => {
		let isValid = true;
		let hasEmailErrors = false;
		let hasRoleErrors = false;
		const updatedEmailValidity: Record<string, boolean> = {};

		const touched = rows.filter(isRowTouched);

		touched.forEach((row) => {
			const emailValid = EMAIL_REGEX.test(row.email);
			const roleValid = row.roleId !== '';

			if (!emailValid || !row.email) {
				isValid = false;
				hasEmailErrors = true;
			}
			if (!roleValid) {
				isValid = false;
				hasRoleErrors = true;
			}

			updatedEmailValidity[row.id] = emailValid;
		});

		setEmailValidity(updatedEmailValidity);
		setHasInvalidEmails(hasEmailErrors);
		setHasInvalidRoles(hasRoleErrors);

		return isValid;
	}, [rows]);

	const addRow = useCallback((): void => {
		setRows((prev) => [...prev, createEmptyRow()]);
	}, []);

	const removeRow = useCallback((id: string): void => {
		setRows((prev) => prev.filter((r) => r.id !== id));
		setEmailValidity((prev) => {
			const updated = { ...prev };
			delete updated[id];
			return updated;
		});
	}, []);

	const updateEmail = useCallback(
		(id: string, email: string): void => {
			setRows((prev) => {
				const updated = cloneDeep(prev);
				const row = updated.find((r) => r.id === id);
				if (row) {
					row.email = email;
				}
				return updated;
			});

			if (hasInvalidEmails) {
				setHasInvalidEmails(false);
			}
			if (emailValidity[id] === false) {
				setEmailValidity((prev) => ({ ...prev, [id]: true }));
			}
			if (inviteResults) {
				setInviteResults(null);
			}

			debouncedValidateEmail(email, id);
		},
		[hasInvalidEmails, emailValidity, inviteResults, debouncedValidateEmail],
	);

	const updateRole = useCallback(
		(id: string, roleId: string | undefined): void => {
			setRows((prev) => {
				const updated = cloneDeep(prev);
				const row = updated.find((r) => r.id === id);
				if (row) {
					row.roleId = roleId ?? '';
				}
				return updated;
			});

			if (hasInvalidRoles) {
				setHasInvalidRoles(false);
			}
			if (inviteResults) {
				setInviteResults(null);
			}
		},
		[hasInvalidRoles, inviteResults],
	);

	const reset = useCallback((): void => {
		setRows(Array.from({ length: initialRowCount }, () => createEmptyRow()));
		setEmailValidity({});
		setHasInvalidEmails(false);
		setHasInvalidRoles(false);
		setInviteResults(null);
	}, [initialRowCount]);

	const submit = useCallback(async (): Promise<InviteResult[]> => {
		if (!validateAllRows()) {
			return [];
		}

		const touched = rows.filter(isRowTouched);
		if (touched.length === 0) {
			return [];
		}

		setIsSubmitting(true);
		setInviteResults(null);

		const results: InviteResult[] = [];

		for (const row of touched) {
			try {
				await createUser({
					email: row.email.trim(),
					frontendBaseUrl: getBaseUrl(),
					userRoles: [{ id: row.roleId }],
				});
				results.push({ email: row.email, success: true });
			} catch (err) {
				const apiErr = convertToApiError(err as AxiosError<RenderErrorResponseDTO>);
				results.push({
					email: row.email,
					success: false,
					error: apiErr?.getErrorMessage() ?? 'Unknown error',
				});
			}
		}

		setInviteResults(results);
		setIsSubmitting(false);

		const failures = results.filter((r) => !r.success);
		const successes = results.filter((r) => r.success);

		if (failures.length === 0) {
			onSuccess?.(results, touched);
		} else if (successes.length > 0) {
			onPartialSuccess?.(results, touched);
		} else {
			onAllFailed?.(results, touched);
		}

		return results;
	}, [validateAllRows, rows, onSuccess, onPartialSuccess, onAllFailed]);

	const canSubmit = useMemo(
		() => !isSubmitting && touchedRows.length > 0,
		[isSubmitting, touchedRows.length],
	);

	return {
		rows,
		emailValidity,
		hasInvalidEmails,
		hasInvalidRoles,
		isSubmitting,
		inviteResults,

		addRow,
		removeRow,
		updateEmail,
		updateRole,
		reset,
		submit,

		touchedRows,
		failedResults,
		successResults,
		canSubmit,
	};
}
