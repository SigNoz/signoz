import { isValidElement, type ReactElement, type ReactNode } from 'react';
import {
	Dropdown,
	type DropdownItemType,
	type DropdownProps,
} from '@signozhq/ui/dropdown';

/**
 * The menu-item shape SigNoz built against `@signozhq/ui/dropdown-menu`.
 * `Dropdown` only accepts its own `items` array, so this module maps the old
 * rows onto that array and renders them.
 */
export type BaseMenuItem = {
	key?: string;
	label?: ReactNode;
	disabled?: boolean;
	disabledTooltip?: ReactNode;
	icon?: ReactNode;
	rightIcon?: ReactNode;
	shortcut?: ReactNode;
	onClick?: (info: { key: string; keyPath: string[] }) => void;
	danger?: boolean;
	className?: string;
};

export type MenuGroup = BaseMenuItem & {
	type: 'group';
	label: string;
	children: MenuItem[];
};

export type MenuDivider = {
	type: 'divider';
	key?: string;
};

export type SubMenuItem = BaseMenuItem & {
	children: MenuItem[];
};

export type CheckboxMenuItem = BaseMenuItem & {
	type: 'checkbox';
	key: string;
	label: ReactNode;
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
};

export type RadioMenuItem = {
	type: 'radio';
	key: string;
	label: ReactNode;
	value: string;
	disabled?: boolean;
	className?: string;
};

export type RadioGroupMenuItem = {
	type: 'radio-group';
	key?: string;
	value?: string;
	onChange?: (value: string) => void;
	children: RadioMenuItem[];
};

export type MenuItem =
	| MenuGroup
	| MenuDivider
	| CheckboxMenuItem
	| RadioGroupMenuItem
	| (SubMenuItem & { type?: never })
	| (BaseMenuItem & { type?: never; children?: never });

export type MenuProps = {
	items: MenuItem[];
	search?: {
		placeholder?: string;
		onSearchChange?: (value: string) => void;
	};
	loading?: boolean | { text?: string };
};

type Align = DropdownProps['align'];
type Side = DropdownProps['side'];

function elementOf(node: ReactNode): ReactElement | undefined {
	return isValidElement(node) ? node : undefined;
}

function disabledFields(item: {
	disabled?: boolean;
	disabledTooltip?: ReactNode;
}): { disabled: boolean; disabledTooltip: ReactNode } | Record<string, never> {
	if (item.disabled === undefined && item.disabledTooltip === undefined) {
		return {};
	}
	return {
		disabled: Boolean(item.disabled),
		disabledTooltip: item.disabledTooltip,
	};
}

function mapItem(item: MenuItem, index: number): DropdownItemType {
	if ('type' in item && item.type === 'divider') {
		return { type: 'separator', value: item.key ?? `separator-${index}` };
	}

	if ('type' in item && item.type === 'group') {
		return {
			type: 'group',
			value: item.key ?? `group-${index}`,
			label: item.label,
			items: item.children.map((child, childIndex) => mapItem(child, childIndex)),
		} as DropdownItemType;
	}

	if ('type' in item && item.type === 'checkbox') {
		return {
			type: 'checkbox',
			name: item.key,
			label: item.label,
			value: item.checked,
			onChange: item.onCheckedChange,
			prefix: elementOf(item.icon),
			...disabledFields(item),
		};
	}

	if ('type' in item && item.type === 'radio-group') {
		return {
			type: 'radio-group',
			name: item.key ?? `radio-${index}`,
			value: item.value,
			onChange: item.onChange,
			items: item.children.map((child) => ({
				value: child.value,
				label: child.label,
				...disabledFields(child),
			})),
		};
	}

	if ('children' in item && item.children) {
		const key = item.key ?? `submenu-${index}`;
		return {
			type: 'submenu',
			value: key,
			label: item.label ?? '',
			prefix: elementOf(item.icon),
			items: item.children.map((child, childIndex) => mapItem(child, childIndex)),
			...disabledFields(item),
		} as DropdownItemType;
	}

	const key = item.key ?? `item-${index}`;
	const shortcut = 'shortcut' in item ? item.shortcut : undefined;
	const suffix = elementOf('rightIcon' in item ? item.rightIcon : undefined);
	return {
		type: 'item',
		value: key,
		label: item.label ?? '',
		danger: 'danger' in item ? item.danger : undefined,
		prefix: elementOf('icon' in item ? item.icon : undefined),
		...(shortcut != null ? { shortcut } : { suffix }),
		onClick:
			'onClick' in item && item.onClick
				? (): void => {
						item.onClick?.({ key, keyPath: [key] });
					}
				: undefined,
		...disabledFields(item),
	};
}

interface DropdownMenuSimpleProps {
	menu: MenuProps;
	children: ReactNode;
	contentMaxWidth?: number | string;
	align?: Align;
	side?: Side;
	testId?: string;
	nativeButton?: boolean;
	disabled?: boolean;
	disabledTooltip?: ReactNode;
}

export function DropdownMenuSimple({
	menu,
	children,
	contentMaxWidth,
	align = 'end',
	side = 'bottom',
	testId,
	nativeButton = true,
	disabled,
	disabledTooltip,
}: DropdownMenuSimpleProps): JSX.Element {
	const loading = menu.loading;
	const loadingText = typeof loading === 'object' ? loading.text : undefined;

	return (
		<Dropdown
			items={menu.items.map(mapItem) as DropdownItemType[]}
			nativeButton={nativeButton}
			align={align}
			side={side}
			contentMaxWidth={contentMaxWidth}
			testId={testId}
			loading={Boolean(loading)}
			disabled={disabled}
			disabledTooltip={disabledTooltip}
			loadingContent={loadingText}
			searchInputProps={
				menu.search
					? {
							placeholder: menu.search.placeholder,
							onChange: menu.search.onSearchChange,
						}
					: undefined
			}
		>
			{children}
		</Dropdown>
	);
}

export default DropdownMenuSimple;
