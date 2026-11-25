import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

export interface LinkAccess {
	disabled: boolean;
	/** The denial, or that the check is still running. */
	reason?: string;
}

export interface LinkPermissions {
	attach: BrandedPermission;
	detach: BrandedPermission;
}

export interface UseLinkPickerAccessArgs {
	/**
	 * The owner's `attach`/`detach` when editing one that exists. Each link
	 * change needs the owner's verb as well as the linked item's.
	 */
	owner?: LinkPermissions;
	/** Asked with the linked items, e.g. the owner's `update`. */
	ownerChecks?: BrandedPermission[];
	/** Items the owner already links, by id. */
	linkedIds: string[];
	/**
	 * Items whose change leaves the owner's links as they are, so nothing is
	 * asked and they are always allowed. Wins over `linkedIds`.
	 */
	exemptIds?: string[];
	/** Every item the picker offers, by id. */
	optionIds: string[];
	buildItemPermissions: (id: string) => LinkPermissions;
}

export interface UseLinkPickerAccessReturn {
	/** Whether an item can be added or, if already linked, removed. */
	getAccess: (id: string) => LinkAccess;
	/** Starts the `attach` checks on unlinked items once the picker opens. */
	onPickerVisibleChange: (open: boolean) => void;
	/** Whether an owner check is denied; false while pending or failed. */
	isOwnerDenied: (permission: BrandedPermission) => boolean;
}
