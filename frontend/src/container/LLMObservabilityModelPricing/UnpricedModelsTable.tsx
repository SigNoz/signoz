import { useMemo } from 'react';
import TanStackTable from 'components/TanStackTableView';

import { SKELETON_ROW_COUNT } from './constants';
import styles from './LLMObservabilityModelPricing.module.scss';
import type { UnpricedModel } from './types';
import {
	getUnpricedModelsColumns,
	type UnpricedColumnsConfig,
} from './unpricedModels.table.config';

interface UnpricedModelsTableProps {
	models: UnpricedModel[];
	isLoading: boolean;
	columnsConfig: UnpricedColumnsConfig;
}

// The unmapped-models endpoint returns the full set in one response, so there's
// no pagination here — just a content-height list. Virtual scroll is disabled
// because the set is small and bounded.
function UnpricedModelsTable({
	models,
	isLoading,
	columnsConfig,
}: UnpricedModelsTableProps): JSX.Element {
	const columns = useMemo(
		() => getUnpricedModelsColumns(columnsConfig),
		[columnsConfig],
	);

	if (!isLoading && models.length === 0) {
		return (
			<div className={styles.modelCostsTable} data-testid="unpriced-models-empty">
				All models in your traces are priced.
			</div>
		);
	}

	return (
		<TanStackTable<UnpricedModel>
			className={styles.modelCostsTable}
			data={models}
			columns={columns}
			isLoading={isLoading}
			skeletonRowCount={SKELETON_ROW_COUNT}
			getRowKey={(row): string => row.modelName}
			disableVirtualScroll
			testId="unpriced-models-table"
		/>
	);
}

export default UnpricedModelsTable;
