import { type ChangeEvent, useCallback, useState } from 'react';
import { Modal } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { Bookmark, CircleAlert, Plus, Search, Trash2 } from '@signozhq/icons';
import cx from 'classnames';

import type { SavedView } from '../../types';
import { type BuiltinView } from '../../utils/views';
import SaveViewPopover from './SaveViewPopover';

import styles from './ViewsRail.module.scss';

interface Props {
	activeViewId: string;
	builtinViews: BuiltinView[];
	customViews: SavedView[];
	customViewsLoading: boolean;
	isCustomActive: boolean;
	isModified: boolean;
	collapsed?: boolean;
	onSelect: (id: string) => void;
	onSave: (name: string) => void;
	onSaveChanges: () => void;
	onReset: () => void;
	onClearFilters: () => void;
	onDelete: (id: string) => void;
}

interface ViewRow {
	id: string;
	label: string;
	icon: BuiltinView['icon'];
	deletable?: boolean;
}

// Purely presentational — active view, dirty state, and handlers come from
// `useActiveView`.
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
	onClearFilters,
	onDelete,
}: Props): JSX.Element {
	const [saveOpen, setSaveOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [modal, contextHolder] = Modal.useModal();

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

	const confirmDelete = useCallback(
		(id: string, label: string): void => {
			const { destroy } = modal.confirm({
				title: (
					<Typography.Title level={5}>
						Delete the{' '}
						<Typography.Text className={styles.deleteName}>{label}</Typography.Text>{' '}
						view?
					</Typography.Title>
				),
				content: 'This removes the saved view. Your dashboards are not affected.',
				icon: (
					<CircleAlert
						style={{ color: 'var(--danger-background)', marginInlineEnd: '12px' }}
						size="3xl"
					/>
				),
				okText: 'Delete',
				okButtonProps: {
					danger: true,
					onClick: (e): void => {
						e.preventDefault();
						e.stopPropagation();
						onDelete(id);
						destroy();
					},
				},
				centered: true,
			});
		},
		[modal, onDelete],
	);

	const renderItem = (row: ViewRow): JSX.Element => {
		const Icon = row.icon;
		const active = row.id === activeViewId;
		return (
			<div key={row.id} className={cx(styles.row, { [styles.rowActive]: active })}>
				<Button
					variant="ghost"
					color="secondary"
					className={styles.item}
					onClick={(): void => onSelect(row.id)}
					testId={`dashboards-view-${row.id}`}
				>
					<Icon size={16} className={styles.itemIcon} />
					<Typography.Text className={styles.itemLabel}>{row.label}</Typography.Text>
					{active && isModified && (
						<div className={styles.dirtyDot} title="Unsaved changes" />
					)}
				</Button>
				{row.deletable && (
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						className={styles.itemAction}
						aria-label="Delete view"
						title="Delete view"
						onClick={(e): void => {
							e.stopPropagation();
							confirmDelete(row.id, row.label);
						}}
					>
						<Trash2 size={12} />
					</Button>
				)}
			</div>
		);
	};

	return (
		<aside className={cx(styles.rail, { [styles.collapsed]: collapsed })}>
			<div className={styles.header}>
				<h4 className={styles.headerTitle}>Views</h4>
				<SaveViewPopover
					open={saveOpen}
					onOpenChange={setSaveOpen}
					onSave={onSave}
					trigger={
						<Button
							variant="ghost"
							color="secondary"
							size="icon"
							title="Save current filters as a view"
							testId="dashboards-view-save-trigger"
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
					testId="dashboards-view-search"
					onChange={(e: ChangeEvent<HTMLInputElement>): void =>
						setQuery(e.target.value)
					}
				/>
			</div>

			<div className={styles.scroll}>
				{personal.length > 0 && (
					<>
						<div className={styles.groupLabel}>Personal</div>
						{personal.map((v) => renderItem(v))}
					</>
				)}

				{system.length > 0 && (
					<>
						<div className={cx(styles.groupLabel, styles.groupLabelSpaced)}>
							System
						</div>
						{system.map((v) => renderItem(v))}
					</>
				)}

				{(!q || custom.length > 0) && (
					<>
						<div className={cx(styles.groupLabel, styles.groupLabelSpaced)}>
							My views
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
							custom.map((v) =>
								renderItem({
									id: v.id,
									label: v.name,
									icon: Bookmark,
									deletable: true,
								}),
							)
						)}
					</>
				)}

				{noMatches && (
					<div className={styles.searchEmpty}>
						No views match &ldquo;{query}&rdquo;
					</div>
				)}
			</div>

			{isCustomActive && isModified && (
				<div className={styles.dirtyPanel}>
					<div className={styles.dirtyTitle}>Unsaved changes</div>
					<div className={styles.dirtyActions}>
						<Button
							variant="solid"
							color="primary"
							size="sm"
							onClick={onSaveChanges}
							testId="dashboards-view-save-changes"
						>
							Save
						</Button>
						<Button
							variant="outlined"
							color="secondary"
							size="sm"
							onClick={(): void => setSaveOpen(true)}
						>
							Save as…
						</Button>
						<Button variant="ghost" color="secondary" size="sm" onClick={onReset}>
							Reset
						</Button>
					</div>
				</div>
			)}

			{!isCustomActive && isModified && (
				<div className={cx(styles.dirtyPanel, styles.dirtyPanelDefault)}>
					<div className={styles.dirtyTitle}>Filters active</div>
					<div className={styles.dirtyActions}>
						<Button
							variant="solid"
							color="primary"
							size="sm"
							prefix={<Plus size={12} />}
							onClick={(): void => setSaveOpen(true)}
							testId="dashboards-view-save-as-new"
						>
							Save as new view
						</Button>
						<Button
							variant="ghost"
							color="secondary"
							size="sm"
							onClick={onClearFilters}
						>
							Clear
						</Button>
					</div>
				</div>
			)}
			{contextHolder}
		</aside>
	);
}

export default ViewsRail;
