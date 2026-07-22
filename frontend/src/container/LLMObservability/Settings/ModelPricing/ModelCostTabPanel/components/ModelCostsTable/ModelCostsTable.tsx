import { useMemo } from 'react';
import TanStackTable from 'components/TanStackTableView';

import {
	LIMIT_KEY,
	PAGE_KEY,
	PAGE_SIZE,
	SKELETON_ROW_COUNT,
} from '../../../constants';
import styles from './ModelCostsTable.module.scss';
import { getModelCostsColumns } from './TableConfig';
import { type LlmpricingruletypesLLMPricingRuleDTO } from 'api/generated/services/sigNoz.schemas';

interface ModelCostsTableProps {
	rules: LlmpricingruletypesLLMPricingRuleDTO[];
	isLoading: boolean;
	total: number;
	selectedRuleId: string | null;
	canManage: boolean;
	onEdit: (rule: LlmpricingruletypesLLMPricingRuleDTO) => void;
	onDelete: (rule: LlmpricingruletypesLLMPricingRuleDTO) => void;
}

// The table owns its own pagination URL state (page/limit) via enableQueryParams;
// ModelCostsTab reads the same keys to build the list request. Virtual scroll is
// disabled: a plain table renders fine at our page sizes (up to 100 rows) and the
// fixed-height scroll viewport (.modelCostsTable) keeps large pages scrolling
// inside the table.
function ModelCostsTable({
	rules,
	isLoading,
	total,
	selectedRuleId,
	canManage,
	onEdit,
	onDelete,
}: ModelCostsTableProps): JSX.Element {
	const columns = useMemo(
		() => getModelCostsColumns({ canManage, onEdit, onDelete }),
		[canManage, onEdit, onDelete],
	);

	if (!isLoading && rules.length === 0) {
		return (
			<div className={styles.modelCostsEmpty} data-testid="model-costs-empty">
				No model costs yet.
			</div>
		);
	}

	return (
		<TanStackTable<LlmpricingruletypesLLMPricingRuleDTO>
			className={styles.modelCostsTable}
			data={rules}
			columns={columns}
			isLoading={isLoading}
			skeletonRowCount={SKELETON_ROW_COUNT}
			getRowKey={(row): string => row.id}
			isRowActive={(row): boolean => row.id === selectedRuleId}
			disableVirtualScroll
			testId="model-costs-table"
			enableQueryParams={{ page: PAGE_KEY, limit: LIMIT_KEY }}
			pagination={{
				total,
				defaultLimit: PAGE_SIZE,
				showTotalCount: true,
				totalCountLabel: 'models',
			}}
		/>
	);
}

export default ModelCostsTable;
