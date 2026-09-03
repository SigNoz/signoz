import { useMemo } from 'react';
import { useListUsers } from 'api/generated/services/users';

import type { CreatorOption } from '../components/FilterZone/FilterChips';

interface Args {
	currentUserEmail: string;
	// Authors on the loaded page — kept selectable until the org list resolves.
	fallbackEmails: string[];
}

// Creator-filter options sourced from the org's full user list, so authors who
// aren't on the current page are still selectable (v2 "List users" API).
export function useCreatorOptions({
	currentUserEmail,
	fallbackEmails,
}: Args): CreatorOption[] {
	const { data } = useListUsers();

	return useMemo<CreatorOption[]>(() => {
		const users = data?.data ?? [];
		const emails = new Set<string>();
		if (currentUserEmail) {
			emails.add(currentUserEmail);
		}
		users.forEach((u) => u.email && emails.add(u.email));
		// Until the org list resolves (or if it comes back empty), keep the page's
		// authors selectable so the filter never regresses to just "me".
		if (users.length === 0) {
			fallbackEmails.forEach((e) => emails.add(e));
		}

		const labelFor = (email: string): string => {
			if (email === currentUserEmail) {
				return `${email} (me)`;
			}
			const match = users.find((u) => u.email === email);
			return match?.displayName ? `${match.displayName} (${email})` : email;
		};

		return [...emails].sort().map((email) => ({ email, label: labelFor(email) }));
	}, [data, currentUserEmail, fallbackEmails]);
}
