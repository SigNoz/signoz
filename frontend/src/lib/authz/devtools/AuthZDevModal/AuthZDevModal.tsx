import { DialogWrapper } from '@signozhq/ui/dialog';
import { useCallback, useRef } from 'react';

import { useAuthZDevStore } from '../useAuthZDevStore';
import { useAuthZQueryInvalidation } from '../useAuthZQueryInvalidation';

import { AuthZDevModalContent } from './AuthZDevModalContent';
import { AuthZDevModalFooter } from './AuthZDevModalFooter';
import { AuthZDevModalHeader } from './AuthZDevModalHeader';
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
					searchInputRef={searchInputRef}
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
					indexByPermission={indexByPermission}
					selectedIndex={selectedIndex}
					setSelectedIndex={setSelectedIndex}
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
