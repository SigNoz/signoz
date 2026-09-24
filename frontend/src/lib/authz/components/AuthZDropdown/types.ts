import type {
	DropdownActionItemType,
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

export type AuthZDropdownItemType =
	| (AuthZGateableItemType & {
			/**
			 * Permissions the row needs (AND semantics). A row's own `disabled` or
			 * `loading` outranks them, and they are then skipped.
			 */
			checks?: BrandedPermission[];
	  })
	| Exclude<DropdownItemType, AuthZGateableItemType>;

export type AuthZDropdownProps = Omit<DropdownProps, 'items'> & {
	items: AuthZDropdownItemType[];
};
