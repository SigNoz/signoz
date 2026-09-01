import { useCallback, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import {
	createUser,
	getResetPasswordToken,
} from 'api/generated/services/users';
import { EMAIL_REGEX } from 'utils/app';
import { getBaseUrl, getAbsoluteUrl } from 'utils/basePath';
import {
	InviteResult,
	UseInviteMembersOptions,
	UseInviteMembersReturn,
} from './types';

export function useInviteMembers(
	options: UseInviteMembersOptions = {},
): UseInviteMembersReturn {
	const { onSuccess, onPartialSuccess, onAllFailed } = options;

	const [emailsText, setEmailsText] = useState<string>('');
	const [globalRoleIds, setGlobalRoleIds] = useState<string[]>([]);
	const [hasInvalidEmails, setHasInvalidEmails] = useState(false);
	const [hasInvalidRoles, setHasInvalidRoles] = useState(false);
	const [invalidEmailsList, setInvalidEmailsList] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [inviteResults, setInviteResults] = useState<InviteResult[] | null>(
		null,
	);

	// States for Excel data mapping
	const [parsedNames, setParsedNames] = useState<Record<string, string>>({});
	const [parsedDomains, setParsedDomains] = useState<Record<string, string>>({});

	const parsedEmails = useMemo(() => {
		return emailsText
			.split(/[\s,;\n]+/)
			.map((email) => email.trim())
			.filter((email) => email.length > 0);
	}, [emailsText]);

	const failedResults = useMemo(
		() => inviteResults?.filter((r) => !r.success) ?? [],
		[inviteResults],
	);

	const successResults = useMemo(
		() => inviteResults?.filter((r) => r.success) ?? [],
		[inviteResults],
	);

	const validateInputs = useCallback((): boolean => {
		const emails = parsedEmails;
		const invalid = emails.filter((email) => !EMAIL_REGEX.test(email));
		const isEmailValid = emails.length > 0 && invalid.length === 0;
		const isRoleValid = globalRoleIds.length > 0;

		setInvalidEmailsList(invalid);
		setHasInvalidEmails(!isEmailValid);
		setHasInvalidRoles(!isRoleValid);

		return isEmailValid && isRoleValid;
	}, [parsedEmails, globalRoleIds]);

	const reset = useCallback((): void => {
		setEmailsText('');
		setGlobalRoleIds([]);
		setHasInvalidEmails(false);
		setHasInvalidRoles(false);
		setInvalidEmailsList([]);
		setInviteResults(null);
		setParsedNames({});
		setParsedDomains({});
	}, []);

	const submit = useCallback(async (): Promise<InviteResult[]> => {
		if (!validateInputs()) {
			return [];
		}

		const emailsToInvite = parsedEmails;
		setIsSubmitting(true);
		setInviteResults(null);

		const results: InviteResult[] = [];

		const invitePromises = emailsToInvite.map(async (email) => {
			const targetEmail = email.toLowerCase();
			const mappedName = parsedNames[targetEmail] || '';
			const mappedDomain = parsedDomains[targetEmail] || '';

			try {
				// 1. Create the user
				const createResponse = await createUser({
					email: targetEmail,
					frontendBaseUrl: getBaseUrl(),
					userRoles: globalRoleIds.map((id) => ({ id })),
				});

				const createdUserId = createResponse?.data?.id;
				let inviteLink = '';

				// 2. Fetch the password reset token
				if (createdUserId) {
					try {
						const tokenResponse = await getResetPasswordToken({ id: createdUserId });
						const token = tokenResponse?.data?.token;
						if (token) {
							inviteLink = getAbsoluteUrl(`/password-reset?token=${token}`);
						}
					} catch (tokenErr) {
						// Fallback if token fetch fails
						console.error(
							'Failed to generate reset token for user',
							createdUserId,
							tokenErr,
						);
					}
				}

				results.push({
					email,
					name: mappedName,
					domain: mappedDomain,
					inviteLink,
					success: true,
				});
			} catch (err) {
				const apiErr = convertToApiError(err as AxiosError<RenderErrorResponseDTO>);
				results.push({
					email,
					name: mappedName,
					domain: mappedDomain,
					success: false,
					error: apiErr?.getErrorMessage() ?? 'Unknown error',
				});
			}
		});

		await Promise.all(invitePromises);

		setInviteResults(results);
		setIsSubmitting(false);

		const failures = results.filter((r) => !r.success);
		const successes = results.filter((r) => r.success);

		const mockRows = emailsToInvite.map((email) => ({
			id: email,
			email,
			roleIds: globalRoleIds,
		}));

		if (failures.length === 0) {
			onSuccess?.(results, mockRows);
		} else if (successes.length > 0) {
			onPartialSuccess?.(results, mockRows);
		} else {
			onAllFailed?.(results, mockRows);
		}

		return results;
	}, [
		validateInputs,
		parsedEmails,
		globalRoleIds,
		parsedNames,
		parsedDomains,
		onSuccess,
		onPartialSuccess,
		onAllFailed,
	]);

	const canSubmit = useMemo(
		() => !isSubmitting && parsedEmails.length > 0,
		[isSubmitting, parsedEmails.length],
	);

	return {
		emailsText,
		setEmailsText,
		globalRoleIds,
		setGlobalRoleIds,
		hasInvalidEmails,
		hasInvalidRoles,
		isSubmitting,
		inviteResults,
		reset,
		submit,
		failedResults,
		successResults,
		canSubmit,
		invalidEmailsList,
		parsedNames,
		setParsedNames,
		parsedDomains,
		setParsedDomains,
	};
}
