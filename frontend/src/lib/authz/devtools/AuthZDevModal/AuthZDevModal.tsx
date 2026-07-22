import { DialogWrapper } from '@signozhq/ui/dialog';
import { useCallback } from 'react';

import { useAuthZDevStore } from '../useAuthZDevStore';
import { useAuthZQueryInvalidation } from '../useAuthZQueryInvalidation';

import { AuthZDevModalContent } from './AuthZDevModalContent';
import { AuthZDevModalFooter } from './AuthZDevModalFooter';
import { AuthZDevModalHeader } from './AuthZDevModalHeader';
import { useAuthZDevModalData } from './useAuthZDevModalData';

import styles from './AuthZDevModal.module.css';

export function AuthZDevModal(): JSX.Element | null {
	const isModalOpen = useAuthZDevStore((s) => s.isModalOpen);
	const closeModal = useAuthZDevStore((s) => s.closeModal);
	const observed = useAuthZDevStore((s) => s.observed);
	const overrides = useAuthZDevStore((s) => s.overrides);
	const setOverride = useAuthZDevStore((s) => s.setOverride);
	const clearAllOverrides = useAuthZDevStore((s) => s.clearAllOverrides);
	const grantAll = useAuthZDevStore((s) => s.grantAll);
	const denyAll = useAuthZDevStore((s) => s.denyAll);

	useAuthZQueryInvalidation(overrides);

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
		hasActiveFilter,
		filteredOverrideCount,
		overrideCount,
	} = useAuthZDevModalData(observed, overrides);

	const handleOpenChange = useCallback(
		(open: boolean): void => {
			if (!open) {
				closeModal();
			}
		},
		[closeModal],
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
				<AuthZDevModalHeader
					search={search}
					setSearch={setSearch}
					resourceFilter={resourceFilter}
					setResourceFilter={setResourceFilter}
					resourceFilterItems={resourceFilterItems}
					hasActiveFilter={hasActiveFilter}
					filteredPermissions={filteredPermissions}
					filteredOverrideCount={filteredOverrideCount}
					overrideCount={overrideCount}
					grantAll={grantAll}
					denyAll={denyAll}
					clearAllOverrides={clearAllOverrides}
				/>
				<AuthZDevModalContent
					observedListLength={observedList.length}
					orderedPermissions={orderedPermissions}
					groups={groups}
					observed={observed}
					overrides={overrides}
					onSetOverride={setOverride}
				/>
				<AuthZDevModalFooter
					orderedPermissionsCount={orderedPermissions.length}
					observedListLength={observedList.length}
				/>
			</div>
		</DialogWrapper>
	);
}
