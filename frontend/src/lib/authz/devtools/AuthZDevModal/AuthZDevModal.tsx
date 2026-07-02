import { Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import { Kbd } from '@signozhq/ui/kbd';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import { useCallback, useRef } from 'react';

import { useAuthZDevStore } from '../useAuthZDevStore';
import { useAuthZQueryInvalidation } from '../useAuthZQueryInvalidation';

import { PermissionRow } from './PermissionRow';
import { useAuthZDevModalData } from './useAuthZDevModalData';
import { useModalKeyboard } from './useModalKeyboard';

import styles from './AuthZDevModal.module.css';

export function AuthZDevModal(): JSX.Element | null {
	const isModalOpen = useAuthZDevStore((s) => s.isModalOpen);
	const closeModal = useAuthZDevStore((s) => s.closeModal);
	const observed = useAuthZDevStore((s) => s.observed);
	const overrides = useAuthZDevStore((s) => s.overrides);
	const cycleOverride = useAuthZDevStore((s) => s.cycleOverride);
	const setOverride = useAuthZDevStore((s) => s.setOverride);
	const clearAllOverrides = useAuthZDevStore((s) => s.clearAllOverrides);
	const grantAll = useAuthZDevStore((s) => s.grantAll);
	const denyAll = useAuthZDevStore((s) => s.denyAll);

	useAuthZQueryInvalidation(overrides);

	const searchInputRef = useRef<HTMLInputElement>(null);

	const {
		search,
		setSearch,
		resourceFilter,
		setResourceFilter,
		observedList,
		resourceFilterItems,
		filteredPermissions,
		groups,
		orderedPermissions,
		indexByPermission,
		hasActiveFilter,
		filteredOverrideCount,
		overrideCount,
	} = useAuthZDevModalData(observed, overrides);

	const { selectedIndex, setSelectedIndex } = useModalKeyboard({
		permissions: orderedPermissions,
		overrides,
		onCycle: cycleOverride,
		onSetOverride: setOverride,
		onClose: closeModal,
		searchInputRef,
	});

	const handleOpenChange = useCallback(
		(open: boolean): void => {
			if (!open) {
				closeModal();
				setSelectedIndex(-1);
			}
		},
		[closeModal, setSelectedIndex],
	);

	const handleGrantAll = useCallback((): void => {
		grantAll(hasActiveFilter ? filteredPermissions : undefined);
	}, [grantAll, hasActiveFilter, filteredPermissions]);

	const handleDenyAll = useCallback((): void => {
		denyAll(hasActiveFilter ? filteredPermissions : undefined);
	}, [denyAll, hasActiveFilter, filteredPermissions]);

	const handleClearAll = useCallback((): void => {
		clearAllOverrides(hasActiveFilter ? filteredPermissions : undefined);
	}, [clearAllOverrides, hasActiveFilter, filteredPermissions]);

	const handleSelectIndex = useCallback(
		(index: number) => (): void => {
			setSelectedIndex(index);
		},
		[setSelectedIndex],
	);

	return (
		<DialogWrapper
			open={isModalOpen}
			onOpenChange={handleOpenChange}
			title="AuthZ DevTools"
			subTitle="Force permission results locally without touching the backend."
			className={styles.modal}
			width="wide"
		>
			<div className={styles.content}>
				<div className={styles.header}>
					<div className={styles.searchRow}>
						<div className={styles.search}>
							<Input
								ref={searchInputRef}
								placeholder="Search permissions..."
								value={search}
								onChange={(e): void => setSearch(e.target.value)}
								prefix={<Search size={14} className={styles.searchIcon} />}
								aria-label="Search permissions"
								data-testid="authz-dev-search"
							/>
						</div>
						<div className={styles.filter}>
							<SelectSimple
								items={resourceFilterItems}
								value={resourceFilter}
								onChange={(value): void => setResourceFilter(value as string)}
								testId="authz-dev-resource-filter"
								withPortal={false}
							/>
						</div>
					</div>
					<div className={styles.actionsRow}>
						<Button
							className={styles.actionButton}
							variant="outlined"
							color="success"
							size="sm"
							onClick={handleGrantAll}
							disabled={filteredPermissions.length === 0}
							data-testid="authz-dev-grant-all"
						>
							{hasActiveFilter ? 'Grant filtered' : 'Grant all'}
						</Button>
						<Button
							className={styles.actionButton}
							variant="outlined"
							color="error"
							size="sm"
							onClick={handleDenyAll}
							disabled={filteredPermissions.length === 0}
							data-testid="authz-dev-deny-all"
						>
							{hasActiveFilter ? 'Deny filtered' : 'Deny all'}
						</Button>
						<Button
							className={styles.actionButton}
							variant="outlined"
							color="secondary"
							size="sm"
							onClick={handleClearAll}
							disabled={
								hasActiveFilter ? filteredOverrideCount === 0 : overrideCount === 0
							}
							data-testid="authz-dev-clear-all"
						>
							{hasActiveFilter
								? `Clear filtered (${filteredOverrideCount})`
								: `Clear all (${overrideCount})`}
						</Button>
					</div>
				</div>
				<div className={styles.list} data-testid="authz-dev-permission-list">
					{orderedPermissions.length === 0 ? (
						<div className={styles.empty}>
							<Typography.Text align="center" color="muted">
								{observedList.length === 0
									? 'No permissions observed yet. Navigate the app to trigger permission checks.'
									: 'No permissions match your search.'}
							</Typography.Text>
						</div>
					) : (
						groups.map((group) => (
							<div key={group.resource} className={styles.section}>
								<div className={styles.sectionHeader}>
									<Typography.Text as="span" size="medium" weight="semibold">
										{group.resource}
									</Typography.Text>
									<Typography.Text as="span" size="small" color="muted">
										{group.items.length}
									</Typography.Text>
								</div>
								{group.items.map((permission) => {
									const index = indexByPermission.get(permission) ?? 0;
									return (
										<PermissionRow
											key={permission}
											observed={observed[permission]}
											override={overrides[permission]}
											isSelected={index === selectedIndex}
											onSetOverride={setOverride}
											onSelect={handleSelectIndex(index)}
										/>
									);
								})}
							</div>
						))
					)}
				</div>
				<div className={styles.footer}>
					<div className={styles.hint}>
						<span className={styles.hintGroup}>
							<Kbd>↑</Kbd>
							<Kbd>↓</Kbd>
							<Typography.Text as="span" size="small" color="muted">
								navigate
							</Typography.Text>
						</span>
						<span className={styles.hintGroup}>
							<Kbd>←</Kbd>
							<Kbd>→</Kbd>
							<Typography.Text as="span" size="small" color="muted">
								mode
							</Typography.Text>
						</span>
						<span className={styles.hintGroup}>
							<Kbd>1-5</Kbd>
							<Typography.Text as="span" size="small" color="muted">
								set
							</Typography.Text>
						</span>
						<span className={styles.hintGroup}>
							<Kbd>/</Kbd>
							<Typography.Text as="span" size="small" color="muted">
								search
							</Typography.Text>
						</span>
						<span className={styles.hintGroup}>
							<Kbd>Esc</Kbd>
							<Typography.Text as="span" size="small" color="muted">
								close
							</Typography.Text>
						</span>
					</div>
					<Typography.Text size="small" color="muted" className={styles.count}>
						{orderedPermissions.length} of {observedList.length} permissions
					</Typography.Text>
				</div>
			</div>
		</DialogWrapper>
	);
}
