import { ResizeTable } from 'components/ResizeTable';
import { useLocation } from 'react-router-dom';

import { getColumns } from '../Columns/ServiceColumn';
import ServiceTableProps from '../types';

function ServiceTraceTable({
	services,
	loading,
}: ServiceTableProps): JSX.Element {
	const { search } = useLocation();

	const tableColumns = getColumns(search, false);

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
