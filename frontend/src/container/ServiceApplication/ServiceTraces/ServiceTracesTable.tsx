import { ResizeTable } from 'components/ResizeTable';
import { FeatureKeys } from 'constants/features';
import { useIsFeatureDisabled } from 'hooks/useFeatureFlag';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { getColumns } from '../Columns/ServiceColumn';
import ServiceTableProps from '../types';

function ServiceTraceTable({
	services,
	loading,
}: ServiceTableProps): JSX.Element {
	const { search } = useLocation();

	const isPreferRPMDisabled = useIsFeatureDisabled(FeatureKeys.PreferRPM);

	const tableColumns = useMemo(
		() =>
			getColumns({
				isMetricData: false,
				isPreferRPMDisabled,
				search,
			}),
		[search, isPreferRPMDisabled],
	);

	return (
		<ResizeTable
			columns={tableColumns}
			loading={loading}
			dataSource={services}
			rowKey="serviceName"
		/>
	);
}

export default ServiceTraceTable;
