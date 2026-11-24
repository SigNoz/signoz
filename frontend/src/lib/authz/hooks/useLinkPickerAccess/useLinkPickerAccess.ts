import { useCallback, useMemo, useState } from 'react';
import { AUTHZ_LOADING_TOOLTIP } from 'lib/authz/components/constants';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';

import type {
	LinkAccess,
	UseLinkPickerAccessArgs,
	UseLinkPickerAccessReturn,
} from './types';

const NO_CHECKS: BrandedPermission[] = [];
const ALLOWED: LinkAccess = { disabled: false };
const PENDING: LinkAccess = { disabled: true, reason: AUTHZ_LOADING_TOOLTIP };

/**
 * Access to each option of a picker that links items to an owner, such as
 * channels to a routing policy. A linked item, and the owner's `detach`, are
 * asked up front, since a tag can be removed without opening the picker; every
 * other item, and the owner's `attach`, once the picker opens. A failed request fails open for its
 * own checks only.
 */
export function useLinkPickerAccess({
	owner,
	ownerChecks = NO_CHECKS,
	linkedIds,
	optionIds,
	buildItemPermissions,
}: UseLinkPickerAccessArgs): UseLinkPickerAccessReturn {
	const { user } = useAppContext();
	const [hasPickerOpened, setHasPickerOpened] = useState(false);

	const linked = useMemo(() => new Set(linkedIds), [linkedIds]);

	const requiredFor = useCallback(
		(id: string): BrandedPermission[] => {
			const verb = linked.has(id) ? 'detach' : 'attach';
			const item = buildItemPermissions(id)[verb];
			return owner ? [owner[verb], item] : [item];
		},
		[linked, owner, buildItemPermissions],
	);

	const upfrontChecks = useMemo(
		() => [
			...ownerChecks,
			...(owner && linkedIds.length > 0 ? [owner.detach] : []),
			...linkedIds.map((id) => buildItemPermissions(id).detach),
		],
		[ownerChecks, owner, linkedIds, buildItemPermissions],
	);
	const pickerChecks = useMemo(() => {
		const unlinked = optionIds.filter((id) => !linked.has(id));
		return [
			...(owner && unlinked.length > 0 ? [owner.attach] : []),
			...unlinked.map((id) => buildItemPermissions(id).attach),
		];
	}, [optionIds, linked, owner, buildItemPermissions]);
	const upfrontSet = useMemo(() => new Set(upfrontChecks), [upfrontChecks]);

	const upfront = useAuthZ(upfrontChecks, {
		enabled: upfrontChecks.length > 0,
	});
	const picker = useAuthZ(pickerChecks, {
		enabled: hasPickerOpened && pickerChecks.length > 0,
	});

	const getAccess = useCallback(
		(id: string): LinkAccess => {
			const required = requiredFor(id).filter(
				(permission) =>
					!(upfrontSet.has(permission) ? upfront.error : picker.error),
			);
			const results = { ...upfront.permissions, ...picker.permissions };
			// A check reports loading only once its fetch starts, a render after the
			// picker opens; a missing result keeps the option from flashing enabled.
			if (required.some((permission) => !results[permission])) {
				return PENDING;
			}

			const denied = required.filter(
				(permission) => !results[permission].isGranted,
			);
			return denied.length > 0
				? { disabled: true, reason: formatDeniedMessage(denied, user.id) }
				: ALLOWED;
		},
		[
			requiredFor,
			upfrontSet,
			upfront.error,
			upfront.permissions,
			picker.error,
			picker.permissions,
			user.id,
		],
	);

	const onPickerVisibleChange = useCallback((open: boolean): void => {
		if (open) {
			setHasPickerOpened(true);
		}
	}, []);

	const { isLoading: isUpfrontLoading, isGranted: isUpfrontGranted } = upfront;
	const isOwnerDenied = useCallback(
		(permission: BrandedPermission): boolean =>
			!isUpfrontLoading && !upfront.error && !isUpfrontGranted(permission),
		[isUpfrontLoading, upfront.error, isUpfrontGranted],
	);

	return { getAccess, onPickerVisibleChange, isOwnerDenied };
}
