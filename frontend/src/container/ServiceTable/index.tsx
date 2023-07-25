import { ResizeTable } from 'components/ResizeTable';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { columns } from './Columns/ServiceColumn';
import { Container } from './styles';
import ServiceTableProp from './types';

function Services({ services }: ServiceTableProp): JSX.Element {
	const { search } = useLocation();

	const tableColumns = useMemo(() => columns(search), [search]);

	return (
		<Container>
			<ResizeTable
				columns={tableColumns}
				dataSource={services}
				rowKey="serviceName"
			/>
		</Container>
	);
}

export default Services;
