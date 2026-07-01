import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Check, X } from '@signozhq/icons';
import TanStackTable from 'components/TanStackTableView';

import styles from './UnpricedMappingConfirmDrawer.module.scss';
import { getUnpricedMappingColumns } from './unpricedMappingConfirm.table.config';
import type { UnpricedModelMapping } from './useUnpricedModelMapping';

interface UnpricedMappingConfirmDrawerProps {
	open: boolean;
	mappings: UnpricedModelMapping[];
	isSaving: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

// Final review step before committing all unpriced-model mappings. Each selected
// model is appended as a match pattern to its chosen billing rule; this drawer
// lays the mappings out in a table (model -> billing model + that rule's pricing)
// so a large batch stays scannable before the batch save.
function UnpricedMappingConfirmDrawer({
	open,
	mappings,
	isSaving,
	onConfirm,
	onCancel,
}: UnpricedMappingConfirmDrawerProps): JSX.Element {
	const count = mappings.length;
	const columns = useMemo(() => getUnpricedMappingColumns(), []);

	const footer = (
		<div className={styles.footer}>
			<Button
				variant="outlined"
				color="secondary"
				onClick={onCancel}
				disabled={isSaving}
				prefix={<X size={12} />}
				testId="unpriced-map-cancel-btn"
			>
				Cancel
			</Button>
			<Button
				variant="solid"
				color="primary"
				loading={isSaving}
				onClick={onConfirm}
				prefix={<Check size={12} />}
				testId="unpriced-map-confirm-btn"
			>
				Confirm
			</Button>
		</div>
	);

	return (
		<DrawerWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onCancel();
				}
			}}
			direction="right"
			width="wide"
			className={styles.confirmDrawer}
			footer={footer}
			title={`Map ${count} model${count === 1 ? '' : 's'} to billing models`}
		>
			<TanStackTable<UnpricedModelMapping>
				className={styles.confirmTable}
				data={mappings}
				columns={columns}
				isLoading={false}
				getRowKey={(row): string => row.model.modelName}
				disableVirtualScroll
				testId="unpriced-map-confirm-table"
			/>
		</DrawerWrapper>
	);
}

export default UnpricedMappingConfirmDrawer;
