import { getGroupByEl } from './utils';
import { useInfraMonitoringGroupBy } from '../hooks';

interface K8sEntityWithMeta {
	meta?: Record<string, string>;
}

function K8sGroupCell<T extends K8sEntityWithMeta>({
	row,
}: {
	row: T;
}): JSX.Element {
	const [groupBy] = useInfraMonitoringGroupBy();
	return getGroupByEl(row, groupBy) as JSX.Element;
}

export default K8sGroupCell;
