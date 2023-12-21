import { WarningFilled } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import { ResizeTable } from 'components/ResizeTable';
import { MAX_RPS_LIMIT } from 'constants/global';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getTotalRPS } from 'utils/services';

import { getColumns } from '../Columns/ServiceColumn';
import ServiceTableProps from '../types';

function ServiceTraceTable({
	services,
	loading,
}: ServiceTableProps): JSX.Element {
	const { search } = useLocation();
	const [RPS, setRPS] = useState(0);
	const { t: getText } = useTranslation(['services']);

	const tableColumns = useMemo(() => getColumns(search, false), [search]);

	useEffect(() => {
		if (services.length > 0) {
			const rps = getTotalRPS(services);
			setRPS(rps);
		} else {
			setRPS(0);
		}
	}, [services]);

	return (
		<>
			{RPS > MAX_RPS_LIMIT && (
				<Flex justify="center">
					<Typography.Title level={5} type="warning" style={{ marginTop: 0 }}>
						<WarningFilled /> {getText('rps_over_100')}
					</Typography.Title>
				</Flex>
			)}

			<ResizeTable
				columns={tableColumns}
				loading={loading}
				dataSource={services}
				rowKey="serviceName"
			/>
		</>
	);
}

export default ServiceTraceTable;
