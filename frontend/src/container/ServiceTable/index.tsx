import { useMemo } from 'react';
import { useAppLocation } from 'lib/router/useAppLocation';
import { ResizeTable } from 'components/ResizeTable';

import { getColumns } from './Columns/ServiceColumn';
import { Container } from './styles';
import ServiceTableProp from './types';

function Services({ services, isLoading }: ServiceTableProp): JSX.Element {
	const { search } = useAppLocation();

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
