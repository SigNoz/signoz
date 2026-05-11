import { useCallback, useMemo } from 'react';
import { JSONTree, KeyPath } from 'react-json-tree';
import { useCopyToClipboard } from 'react-use';
import { Copy, Ellipsis, Pin, PinOff } from '@signozhq/icons';
import { DropdownMenuSimple as Dropdown } from '@signozhq/ui/dropdown-menu';
import { Input } from '@signozhq/ui/input';
import { toast } from '@signozhq/ui/sonner';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { darkTheme, lightTheme, themeExtension } from './constants';
import usePinnedFields from './hooks/usePinnedFields';
import useSearchFilter, { filterTree } from './hooks/useSearchFilter';
import {
	getLeafKeyFromPath,
	keyPathToDisplayString,
	keyPathToForward,
	serializeKeyPath,
} from './utils';

import './PrettyView.styles.scss';

export interface FieldContext {
	fieldKey: string;
	fieldKeyPath: (string | number)[];
	fieldValue: unknown;
	isNested: boolean;
}

interface MenuItem {
	key: string;
	label: React.ReactNode;
	icon?: React.ReactNode;
	disabled?: boolean;
	onClick: () => void;
}

export interface PrettyViewAction {
	key: string;
	label: React.ReactNode;
	icon?: React.ReactNode;
	onClick: (context: FieldContext) => void;
	/** If provided, action is hidden when this returns true for the field key */
	shouldHide?: (key: string) => boolean;
}

export interface VisibleActionsConfig {
	leaf: readonly string[];
	nested: readonly string[];
}

export interface PrettyViewProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: Record<string, any>;
	actions?: PrettyViewAction[];
	visibleActions?: VisibleActionsConfig;
	searchable?: boolean;
	showPinned?: boolean;
	drawerKey?: string;
	/**
	 * Controlled list of pinned key paths (each entry is `JSON.stringify(path)`).
	 * When provided, PrettyView delegates persistence to the caller via
	 * `onPinnedFieldsChange` and skips its own localStorage I/O.
	 */
	pinnedFieldsValue?: string[];
	onPinnedFieldsChange?: (next: string[]) => void;
}

function PrettyView({
	data,
	actions,
	visibleActions,
	searchable = true,
	showPinned = false,
	drawerKey = 'default',
	pinnedFieldsValue,
	onPinnedFieldsChange,
}: PrettyViewProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [, setCopy] = useCopyToClipboard();
	const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(data);
	const {
		isPinned,
		togglePin,
		pinnedEntries,
		pinnedData,
		displayKeyToForwardPath,
	} = usePinnedFields(data, drawerKey, {
		value: pinnedFieldsValue,
		onChange: onPinnedFieldsChange,
	});

	const filteredPinnedData = useMemo(() => {
		const trimmed = searchQuery.trim();
		if (!trimmed) {
			return pinnedData;
		}
		return filterTree(pinnedData, trimmed) || {};
	}, [pinnedData, searchQuery]);

	const theme = useMemo(
		() => ({
			extend: isDarkMode ? darkTheme : lightTheme,
			...themeExtension,
		}),
		[isDarkMode],
	);

	const shouldExpandNodeInitially = useCallback(
		(
			_keyPath: readonly (string | number)[],
			_data: unknown,
			level: number,
		): boolean => level < 5,
		[],
	);

	const isActionVisible = useCallback(
		(actionKey: string, isNested: boolean): boolean => {
			if (!visibleActions) {
				return true;
			}
			const list = isNested ? visibleActions.nested : visibleActions.leaf;
			return list.includes(actionKey);
		},
		[visibleActions],
	);

	const buildMenuItems = useCallback(
		(context: FieldContext): MenuItem[] => {
			const items: MenuItem[] = [];

			// Copy Value action
			if (isActionVisible('copy', context.isNested)) {
				items.push({
					key: 'copy-value',
					label: 'Copy Value',
					icon: <Copy size={12} />,
					onClick: (): void => {
						const text =
							typeof context.fieldValue === 'object'
								? JSON.stringify(context.fieldValue, null, 2)
								: String(context.fieldValue);
						setCopy(text);
						toast.success('Copied to clipboard', {
							position: 'top-right',
						});
					},
				});
			}

			// Pin action
			if (isActionVisible('pin', context.isNested) && !context.isNested) {
				const resolvedPath =
					displayKeyToForwardPath[context.fieldKey] || context.fieldKeyPath;
				const serialized = serializeKeyPath(resolvedPath);
				const pinned = isPinned(serialized);

				items.push({
					key: 'pin',
					label: pinned ? 'Unpin field' : 'Pin field',
					icon: pinned ? <PinOff size={12} /> : <Pin size={12} />,
					onClick: (): void => {
						togglePin(resolvedPath);
					},
				});
			}

			// Custom actions (filter, group, etc.)
			if (actions && actions.length > 0) {
				const leafKey = getLeafKeyFromPath(
					context.fieldKeyPath,
					context.fieldKey,
					displayKeyToForwardPath,
				);

				const visibleCustomActions = actions.filter(
					(action) =>
						isActionVisible(action.key, context.isNested) &&
						!(action.shouldHide && action.shouldHide(leafKey)),
				);
				visibleCustomActions.forEach((action) => {
					items.push({
						key: action.key,
						label: action.label,
						icon: action.icon,
						onClick: (): void => {
							action.onClick(context);
						},
					});
				});
			}

			return items;
		},
		[actions, isActionVisible, isPinned, togglePin, displayKeyToForwardPath],
	);

	const renderWithActions = useCallback(
		({
			content,
			fieldKey,
			fieldKeyPath,
			value,
			isNested,
		}: {
			content: React.ReactNode;
			fieldKey: string;
			fieldKeyPath: (string | number)[];
			value: unknown;
			isNested: boolean;
		}): React.ReactNode => {
			const context: FieldContext = {
				fieldKey,
				fieldKeyPath,
				fieldValue: value,
				isNested,
			};
			const menuItems = buildMenuItems(context);
			return (
				<span className="pretty-view__value-row">
					<span>{content}</span>
					<Dropdown
						menu={{ items: menuItems }}
						align="start"
						className="pretty-view-actions-dropdown"
						// onClick on the dropdown content is forwarded to the underlying div via ...props
						// but is not in the public type. Stop click bubbling so item clicks don't reach
						// clickable ancestors of the trigger through the React tree.
						// @ts-expect-error see comment above
						onClick={(e: React.MouseEvent): void => e.stopPropagation()}
					>
						<span
							className="pretty-view__actions"
							onClick={(e): void => e.stopPropagation()}
							role="button"
							tabIndex={0}
						>
							<Ellipsis size={12} />
						</span>
					</Dropdown>
				</span>
			);
		},
		[buildMenuItems],
	);

	// eslint-disable-next-line max-params
	const getItemString = useCallback(
		(
			_nodeType: string,
			nodeData: unknown,
			itemType: React.ReactNode,
			itemString: string,
			keyPath: KeyPath,
		): React.ReactNode => {
			const forwardPath = keyPathToForward(keyPath);
			return renderWithActions({
				content: (
					<>
						{itemType} {itemString}
					</>
				),
				fieldKey: keyPathToDisplayString(keyPath),
				fieldKeyPath: forwardPath,
				value: nodeData,
				isNested: true,
			});
		},
		[renderWithActions],
	);

	const valueRenderer = useCallback(
		(
			valueAsString: unknown,
			value: unknown,
			...keyPath: KeyPath
		): React.ReactNode => {
			const forwardPath = keyPathToForward(keyPath);
			return renderWithActions({
				content: String(valueAsString),
				fieldKey: keyPathToDisplayString(keyPath),
				fieldKeyPath: forwardPath,
				value,
				isNested: typeof value === 'object' && value !== null,
			});
		},
		[renderWithActions],
	);

	const pinnedLabelRenderer = useCallback(
		(keyPath: KeyPath): React.ReactNode => {
			const displayKey = String(keyPath[0]);
			const entry = pinnedEntries.find((e) => e.displayKey === displayKey);
			return (
				<span className="pretty-view__pinned-label">
					<Pin
						size={12}
						className="pretty-view__pinned-icon"
						onClick={(): void => {
							if (entry) {
								togglePin(entry.forwardPath);
							}
						}}
					/>
					<span>{displayKey}</span>
				</span>
			);
		},
		[togglePin, pinnedEntries],
	);

	return (
		<div className="pretty-view">
			{searchable && (
				<div className="pretty-view__search-wrapper">
					<Input
						className="pretty-view__search-input"
						type="text"
						placeholder="Search for a field..."
						value={searchQuery}
						onChange={(e): void => setSearchQuery(e.target.value)}
					/>
				</div>
			)}

			{showPinned && Object.keys(filteredPinnedData).length > 0 && (
				<div className="pretty-view__pinned">
					<div className="pretty-view__pinned-header">PINNED ITEMS</div>
					<JSONTree
						key={`pinned-${searchQuery}`}
						data={filteredPinnedData}
						theme={theme}
						invertTheme={false}
						hideRoot
						shouldExpandNodeInitially={shouldExpandNodeInitially}
						valueRenderer={valueRenderer}
						getItemString={getItemString}
						labelRenderer={pinnedLabelRenderer}
					/>
				</div>
			)}

			<JSONTree
				key={searchQuery}
				data={filteredData}
				theme={theme}
				invertTheme={false}
				hideRoot
				shouldExpandNodeInitially={shouldExpandNodeInitially}
				valueRenderer={valueRenderer}
				getItemString={getItemString}
			/>
		</div>
	);
}

export default PrettyView;
