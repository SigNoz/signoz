import { Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { useCallback } from 'react';

import { BrandedPermission } from '../../hooks/useAuthZ/types';

import styles from './AuthZDevModal.module.css';

export interface AuthZDevModalHeaderProps {
	search: string;
	setSearch: (value: string) => void;
	resourceFilter: string;
	setResourceFilter: (value: string) => void;
	resourceFilterItems: Array<{ value: string; label: string }>;
	hasActiveFilter: boolean;
	filteredPermissions: BrandedPermission[];
	filteredOverrideCount: number;
	overrideCount: number;
	grantAll: (permissions?: BrandedPermission[]) => void;
	denyAll: (permissions?: BrandedPermission[]) => void;
	clearAllOverrides: (permissions?: BrandedPermission[]) => void;
}

export function AuthZDevModalHeader({
	search,
	setSearch,
	resourceFilter,
	setResourceFilter,
	resourceFilterItems,
	hasActiveFilter,
	filteredPermissions,
	filteredOverrideCount,
	overrideCount,
	grantAll,
	denyAll,
	clearAllOverrides,
}: AuthZDevModalHeaderProps): JSX.Element {
	const handleGrantAll = useCallback((): void => {
		grantAll(hasActiveFilter ? filteredPermissions : undefined);
	}, [grantAll, hasActiveFilter, filteredPermissions]);

	const handleDenyAll = useCallback((): void => {
		denyAll(hasActiveFilter ? filteredPermissions : undefined);
	}, [denyAll, hasActiveFilter, filteredPermissions]);

	const handleClearAll = useCallback((): void => {
		clearAllOverrides(hasActiveFilter ? filteredPermissions : undefined);
	}, [clearAllOverrides, hasActiveFilter, filteredPermissions]);

	return (
		<div className={styles.header}>
			<div className={styles.searchRow}>
				<div className={styles.search}>
					<Input
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
	);
}
