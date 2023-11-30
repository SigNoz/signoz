import { ResizeTable } from 'components/ResizeTable';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { getColumns } from '../Columns/ServiceColumn';
import ServiceTableProps from '../types';

function ServiceTraceTable({
	services,
	loading,
}: ServiceTableProps): JSX.Element {
	const { search } = useLocation();

	const tableColumns = useMemo(() => getColumns(search, false), [search]);

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
