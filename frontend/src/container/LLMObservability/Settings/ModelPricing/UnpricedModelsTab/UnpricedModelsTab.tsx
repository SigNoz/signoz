import { useCallback, useMemo, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { ArrowRight, TriangleAlert } from '@signozhq/icons';
import { useListUnmappedLLMModels } from 'api/generated/services/llmpricingrules';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';

import styles from './UnpricedModelsTab.module.scss';
import type { PricingRule, UnpricedModel } from '../types';
import type { UnpricedColumnsConfig } from './components/UnpricedModelsTable/TableConfig';
import UnpricedMappingConfirmDrawer from './components/UnpricedMappingConfirmDrawer';
import UnpricedModelsTable from './components/UnpricedModelsTable';
import {
	useUnpricedModelMapping,
	type UnpricedModelMapping,
} from './hooks/useUnpricedModelMapping';

function UnpricedModelsTab(): JSX.Element {
	const { data, isLoading, isError } = useListUnmappedLLMModels();

	const { user } = useAppContext();
	const [canManagePricing] = useComponentPermission(
		['manage_llm_pricing'],
		user.role,
	);

	const models: UnpricedModel[] = useMemo(() => data?.data?.items || [], [data]);

	const [selections, setSelections] = useState<Record<string, PricingRule>>({});
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const { mapModels, isSaving } = useUnpricedModelMapping();

	const onSelectRule = useCallback(
		(modelName: string, rule: PricingRule): void => {
			setSelections((prev) => ({ ...prev, [modelName]: rule }));
		},
		[],
	);

	const mappings: UnpricedModelMapping[] = useMemo(
		() =>
			models
				.filter((model) => selections[model.modelName])
				.map((model) => ({ model, rule: selections[model.modelName] })),
		[models, selections],
	);

	const onConfirm = useCallback(async (): Promise<void> => {
		const didSave = await mapModels(mappings);
		if (didSave) {
			setSelections({});
			setIsConfirmOpen(false);
		}
	}, [mapModels, mappings]);

	const columnsConfig: UnpricedColumnsConfig = {
		canManage: canManagePricing,
		selections,
		onSelectRule,
	};

	const selectedCount = mappings.length;

	return (
		<div className={styles.unpricedModelsTab}>
			<div className={styles.toolbar}>
				<div className={styles.banner}>
					<TriangleAlert size="sm" className={styles.bannerIcon} />
					<Typography.Text as="span" size="small" color="warning">
						Models detected in traces without pricing. Add costs so estimated cost can
						be computed.
					</Typography.Text>
				</div>

				{canManagePricing && (
					<Button
						variant="solid"
						color="primary"
						suffix={<ArrowRight size={14} />}
						disabled={selectedCount === 0}
						onClick={(): void => setIsConfirmOpen(true)}
						testId="unpriced-save-btn"
					>
						{selectedCount > 0
							? `Save ${selectedCount} model${selectedCount === 1 ? '' : 's'}`
							: 'Save models'}
					</Button>
				)}
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

			<UnpricedMappingConfirmDrawer
				open={isConfirmOpen}
				mappings={mappings}
				isSaving={isSaving}
				onConfirm={onConfirm}
				onCancel={(): void => setIsConfirmOpen(false)}
			/>
		</div>
	);
}

export default UnpricedModelsTab;
