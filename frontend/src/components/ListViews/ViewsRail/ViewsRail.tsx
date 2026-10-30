import {
	type ChangeEvent,
	type ReactElement,
	useCallback,
	useState,
} from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { Bookmark, Plus, Search } from '@signozhq/icons';
import cx from 'classnames';

import { useDeleteConfirm } from 'components/DeleteConfirmModal/useDeleteConfirm';
import ViewNamePopover from 'components/ViewNamePopover/ViewNamePopover';

import type { BuiltinListView, ViewSaveMode } from '../types';
import ViewsRailDirtyPanel from './ViewsRailDirtyPanel';
import ViewsRailItem from './ViewsRailItem';

import styles from './ViewsRail.module.scss';

interface Props {
	activeViewId: string;
	builtinViews: BuiltinListView[];
	customViews: { id: string; name: string }[];
	customViewsLoading: boolean;
	isCustomActive: boolean;
	isModified: boolean;
	collapsed?: boolean;
	onSelect: (id: string) => void;
	onSave: (name: string) => void;
	onSaveChanges: () => void;
	onReset: () => void;
	onDelete: (id: string) => Promise<void>;
	onRename: (id: string, name: string) => void;
	/** Prefixes the rail's test ids, e.g. `<prefix>-view-<id>`. */
	testIdPrefix: string;
	saveTestIdPrefix?: string;
	renameTestIdPrefix?: string;
	customSectionLabel?: string;
	deleteDescription?: string;
	/** Wraps the rail body, e.g. in an authz guard. */
	guard?: (content: ReactElement) => ReactElement;
	onViewSaved?: (mode: ViewSaveMode) => void;
	onViewRenamed?: () => void;
	onViewDeleted?: () => void;
}

// Purely presentational — active view, dirty state, and handlers come from
// `useListViews`.
function ViewsRail({
	activeViewId,
	builtinViews,
	customViews,
	customViewsLoading,
	isCustomActive,
	isModified,
	collapsed = false,
	onSelect,
	onSave,
	onSaveChanges,
	onReset,
	onDelete,
	onRename,
	testIdPrefix,
	saveTestIdPrefix = 'save-view',
	renameTestIdPrefix = 'rename-view',
	customSectionLabel = 'My views',
	deleteDescription = 'This removes the saved view.',
	guard,
	onViewSaved,
	onViewRenamed,
	onViewDeleted,
}: Props): JSX.Element {
	const [saveOpen, setSaveOpen] = useState(false);
	const [query, setQuery] = useState('');
	const { contextHolder, confirmDelete } = useDeleteConfirm();

	const q = query.trim().toLowerCase();
	const matchesQuery = (label: string): boolean =>
		!q || label.toLowerCase().includes(q);

	const personal = builtinViews.filter(
		(v) => v.section === 'personal' && matchesQuery(v.label),
	);
	const system = builtinViews.filter(
		(v) => v.section === 'system' && matchesQuery(v.label),
	);
	const custom = customViews.filter((v) => matchesQuery(v.name));
	const noMatches =
		!!q && personal.length === 0 && system.length === 0 && custom.length === 0;

	const onConfirmDelete = useCallback(
		(id: string, label: string): void => {
			confirmDelete({
				title: (
					<Typography.Title level={5}>
						Delete the{' '}
						<Typography.Text className={styles.deleteName}>{label}</Typography.Text>{' '}
						view?
					</Typography.Title>
				),
				content: deleteDescription,
				// Return the delete promise so the modal's Delete button stays loading
				// until the backend call settles, then closes — matching dashboard delete.
				onConfirm: (): Promise<void> => {
					onViewDeleted?.();
					return onDelete(id);
				},
			});
		},
		[confirmDelete, deleteDescription, onDelete, onViewDeleted],
	);

	const handleRename = useCallback(
		(id: string, name: string): void => {
			onViewRenamed?.();
			onRename(id, name);
		},
		[onRename, onViewRenamed],
	);

	const handleSaveAsView = (name: string): void => {
		onViewSaved?.('new');
		onSave(name);
	};

	const handleSaveViewChanges = (): void => {
		onViewSaved?.('update');
		onSaveChanges();
	};

	const renderBuiltin = (v: BuiltinListView): JSX.Element => (
		<ViewsRailItem
			key={v.id}
			id={v.id}
			label={v.label}
			icon={v.icon}
			active={v.id === activeViewId}
			isModified={isModified}
			testIdPrefix={testIdPrefix}
			renameTestIdPrefix={renameTestIdPrefix}
			onSelect={onSelect}
		/>
	);

	const content = (
		<>
			<div className={styles.header}>
				<h4 className={styles.headerTitle}>Views</h4>
				<ViewNamePopover
					open={saveOpen}
					onOpenChange={setSaveOpen}
					onSubmit={handleSaveAsView}
					title="Save as view"
					confirmLabel="Save view"
					testIdPrefix={saveTestIdPrefix}
					tooltip="Save current filters as a view"
					trigger={
						<Button
							aria-label="Save current filters as a view"
							variant="ghost"
							color="secondary"
							size="sm"
							icon
							testId={`${testIdPrefix}-view-save-trigger`}
						>
							<Plus size={14} />
						</Button>
					}
				/>
			</div>

			<div className={styles.search}>
				<Input
					value={query}
					placeholder="Filter views by name"
					prefix={<Search size={12} />}
					testId={`${testIdPrefix}-view-search`}
					onChange={(e: ChangeEvent<HTMLInputElement>): void =>
						setQuery(e.target.value)
					}
				/>
			</div>

			<div className={styles.scroll}>
				{personal.length > 0 && (
					<>
						<div className={styles.groupLabel}>Personal</div>
						{personal.map(renderBuiltin)}
					</>
				)}

				{system.length > 0 && (
					<>
						<div className={cx(styles.groupLabel, styles.groupLabelSpaced)}>
							System
						</div>
						{system.map(renderBuiltin)}
					</>
				)}

				{(!q || custom.length > 0) && (
					<>
						<div className={cx(styles.groupLabel, styles.groupLabelSpaced)}>
							{customSectionLabel}
							<Typography.Text className={styles.groupCount}>
								{customViews.length}
							</Typography.Text>
						</div>
						{customViewsLoading ? (
							<div className={styles.empty}>Loading views…</div>
						) : customViews.length === 0 ? (
							<div className={styles.empty}>
								No saved views yet. Filter the list, then save it as a view.
							</div>
						) : (
							custom.map((v) => (
								<ViewsRailItem
									key={v.id}
									id={v.id}
									label={v.name}
									icon={Bookmark}
									active={v.id === activeViewId}
									isModified={isModified}
									testIdPrefix={testIdPrefix}
									renameTestIdPrefix={renameTestIdPrefix}
									onSelect={onSelect}
									onRename={handleRename}
									onDelete={onConfirmDelete}
								/>
							))
						)}
					</>
				)}

				{noMatches && (
					<div className={styles.searchEmpty}>
						No views match &ldquo;{query}&rdquo;
					</div>
				)}
			</div>

			{isModified && (
				<ViewsRailDirtyPanel
					isCustomActive={isCustomActive}
					testIdPrefix={testIdPrefix}
					onSaveChanges={handleSaveViewChanges}
					onSaveAs={(): void => setSaveOpen(true)}
					onReset={onReset}
				/>
			)}
			{contextHolder}
		</>
	);

	return (
		<aside className={cx(styles.rail, { [styles.collapsed]: collapsed })}>
			{guard ? guard(content) : content}
		</aside>
	);
}

export default ViewsRail;
