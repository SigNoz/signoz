import { ResizeTable } from 'components/ResizeTable';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { getColumns } from './Columns/ServiceColumn';
import { Container } from './styles';
import ServiceTableProp from './types';

function Services({ services, isLoading }: ServiceTableProp): JSX.Element {
	const { search } = useLocation();

	const tableColumns = useMemo(() => getColumns(search), [search]);

	return (
		<Container>
			<ResizeTable
				columns={tableColumns}
				dataSource={services}
				loading={isLoading}
				rowKey="serviceName"
			/>
		</Container>
	);
}

export default Services;
