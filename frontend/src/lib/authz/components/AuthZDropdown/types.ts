import type {
	DropdownActionItemType,
	DropdownGroupChildType,
	DropdownGroupItemType,
	DropdownItemType,
	DropdownLinkItemType,
	DropdownProps,
	DropdownSubmenuItemType,
} from '@signozhq/ui/dropdown';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

/** The row kinds that can be disabled, and so gated. */
export type AuthZGateableItemType =
	| DropdownActionItemType
	| DropdownLinkItemType
	| DropdownSubmenuItemType;

type AuthZGatedItemType = AuthZGateableItemType & {
	/**
	 * Permissions the row needs (AND semantics). A row's own `disabled` or
	 * `loading` outranks them, and they are then skipped.
	 */
	checks?: BrandedPermission[];
};

/** What a group may hold, with `checks` on the gateable rows. */
export type AuthZGroupChildType =
	| AuthZGatedItemType
	| Exclude<DropdownGroupChildType, AuthZGateableItemType>;

export type AuthZDropdownItemType =
	| AuthZGatedItemType
	| DropdownGroupItemType<AuthZGroupChildType>
	| Exclude<DropdownItemType, AuthZGateableItemType | DropdownGroupItemType>;

export type AuthZDropdownProps = Omit<DropdownProps, 'items'> & {
	items: AuthZDropdownItemType[];
};
