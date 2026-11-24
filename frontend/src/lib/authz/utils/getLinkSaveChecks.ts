import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import type { LinkPermissions } from 'lib/authz/hooks/useLinkPickerAccess/types';

const difference = (from: string[], remove: string[]): string[] => {
	const removed = new Set(remove);
	return [...new Set(from.filter((id) => !removed.has(id)))];
};

interface LinkSaveChecksInput {
	/** What saving the owner itself needs: `create`, or `update` on it. */
	ownerChecks: BrandedPermission[];
	/** The owner's link verbs; on the wildcard for a new owner. */
	owner: LinkPermissions;
	buildItemPermissions: (id: string) => LinkPermissions;
	/** Items the saved owner links; empty for a new one. */
	savedIds: string[];
	incomingIds: string[];
}

/**
 * What saving an owner that links items needs, as the backend checks it: the
 * owner's own checks, then `attach` on the owner and each item it gains, and
 * `detach` on the owner and each item it loses. Items it keeps are not checked.
 */
export function getLinkSaveChecks({
	ownerChecks,
	owner,
	buildItemPermissions,
	savedIds,
	incomingIds,
}: LinkSaveChecksInput): BrandedPermission[] {
	const attached = difference(incomingIds, savedIds);
	const detached = difference(savedIds, incomingIds);

	const checks = [...ownerChecks];
	if (attached.length > 0) {
		checks.push(
			owner.attach,
			...attached.map((id) => buildItemPermissions(id).attach),
		);
	}
	if (detached.length > 0) {
		checks.push(
			owner.detach,
			...detached.map((id) => buildItemPermissions(id).detach),
		);
	}
	return checks;
}
