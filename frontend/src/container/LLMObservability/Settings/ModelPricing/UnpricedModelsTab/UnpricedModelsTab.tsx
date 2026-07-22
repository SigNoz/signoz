import { useCallback, useEffect, useMemo } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { TriangleAlert } from '@signozhq/icons';
import { useListUnmappedLLMModels } from 'api/generated/services/llmpricingrules';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';

import styles from './UnpricedModelsTab.module.scss';
import ModelCostDrawer, {
	useModelCostDrawer,
} from '../ModelCostTabPanel/components/ModelCostDrawer';
import type { PricingRule, UnpricedModel } from '../types';
import MapConfirmDialog from './components/MapConfirmDialog';
import type { UnpricedColumnsConfig } from './components/UnpricedModelsTable/TableConfig';
import UnpricedModelsTable from './components/UnpricedModelsTable';
import { useUnpricedModelMapping } from './hooks/useUnpricedModelMapping';
import { usePendingMappingStore } from './usePendingMappingStore';

function UnpricedModelsTab(): JSX.Element {
	const { data, isLoading, isError } = useListUnmappedLLMModels();

	const { user } = useAppContext();
	const [canManagePricing] = useComponentPermission(
		['manage_llm_pricing'],
		user.role,
	);

	const models: UnpricedModel[] = useMemo(() => data?.data?.items || [], [data]);

	// Picking a billing model stages a single mapping for confirmation; the
	// mapping only commits once the user confirms in the dialog. Kept in a store
	// (not local state) so the row's memoized select trigger can mirror the pick —
	// see usePendingMappingStore.
	const pendingMapping = usePendingMappingStore((state) => state.pending);
	const setPending = usePendingMappingStore((state) => state.setPending);
	const clearPending = usePendingMappingStore((state) => state.clearPending);
	const { mapModel, isSaving } = useUnpricedModelMapping();

	// Reset any staged mapping when leaving the tab so a stale pick doesn't reopen
	// the dialog on remount (the store outlives this component).
	useEffect(() => (): void => clearPending(), [clearPending]);

	// Reuses the "Model costs" add/edit drawer to define brand-new pricing for a
	// model that has no matching billing model to map onto. Saving resolves the
	// model, so it drops off this tab (the drawer invalidates the unmapped list).
	const drawer = useModelCostDrawer();

	const onRequestMap = useCallback(
		(model: UnpricedModel, rule: PricingRule): void => {
			setPending({ model, rule });
		},
		[setPending],
	);

	const onConfirmMap = useCallback(async (): Promise<void> => {
		if (!pendingMapping) {
			return;
		}
		const didSave = await mapModel(pendingMapping);
		if (didSave) {
			clearPending();
		}
	}, [mapModel, pendingMapping, clearPending]);

	// openForAdd is stable (useCallback with no deps); drawer itself is a fresh
	// object each render, so depend on the method, not the object.
	const { openForAdd } = drawer;
	const onCreateNew = useCallback(
		(modelName: string): void => openForAdd(modelName),
		[openForAdd],
	);
	const columnsConfig = useMemo<UnpricedColumnsConfig>(
		() => ({
			canManage: canManagePricing,
			onRequestMap,
			onCreateNew,
		}),
		[canManagePricing, onRequestMap, onCreateNew],
	);

	return (
		<div className={styles.unpricedModelsTab}>
			<div className={styles.banner}>
				<TriangleAlert size="sm" className={styles.bannerIcon} />
				<Typography.Text as="span" size="small" color="warning">
					Models detected in traces without pricing. Map each to a billing model or
					create pricing so estimated cost can be computed.
				</Typography.Text>
			</div>

			{isError && (
				<div className={styles.error}>
					<Typography.Text as="p" size="small" color="danger" role="alert">
						Failed to load unpriced models. Please try again.
					</Typography.Text>
				</div>
			)}

			<UnpricedModelsTable
				models={models}
				isLoading={isLoading}
				columnsConfig={columnsConfig}
			/>

			{pendingMapping && (
				<MapConfirmDialog
					open
					model={pendingMapping.model}
					rule={pendingMapping.rule}
					isSaving={isSaving}
					onConfirm={onConfirmMap}
					onCancel={clearPending}
				/>
			)}

			{drawer.isOpen && (
				<ModelCostDrawer
					isOpen={drawer.isOpen}
					mode={drawer.mode}
					initialDraft={drawer.initialDraft}
					onClose={drawer.close}
					onSave={drawer.save}
					isSaving={drawer.isSaving}
					saveError={drawer.saveError}
					canManage={canManagePricing}
				/>
			)}
		</div>
	);
}

export default UnpricedModelsTab;
