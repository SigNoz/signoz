import type { SelectSimpleItem } from '@signozhq/ui/select';

import { getRelatedCategories } from '../../Base/relations';
import { InfraMonitoringEntity, K8S_CATEGORY_LABELS } from '../../constants';

export function buildRelatedEntityOptions(
	category: InfraMonitoringEntity,
): SelectSimpleItem[] {
	return getRelatedCategories(category).map((target) => ({
		value: target,
		label: K8S_CATEGORY_LABELS[target],
	}));
}
