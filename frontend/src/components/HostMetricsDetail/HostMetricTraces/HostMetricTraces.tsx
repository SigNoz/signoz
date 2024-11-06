import './HostMetricTraces.styles.scss';

import { Skeleton } from 'antd';
import { ResizeTable } from 'components/ResizeTable';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';

import { columns, getHostTracesQueryPayload } from './constants';

interface Props {
	hostName: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
}

function HostMetricTraces({ hostName, timeRange }: Props): JSX.Element {
	const [traces, setTraces] = useState<any[]>([]);
	const [offset] = useState<number>(0);

	const queryPayload = useMemo(
		() =>
			getHostTracesQueryPayload(
				hostName,
				timeRange.startTime,
				timeRange.endTime,
				offset,
			),
		[hostName, timeRange.startTime, timeRange.endTime, offset],
	);

	const { data, isLoading } = useQuery({
		queryKey: ['hostMetricTraces', queryPayload, DEFAULT_ENTITY_VERSION],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
	});

	useEffect(() => {
		if (data?.payload?.data?.newResult?.data?.result) {
			const currentData = data.payload.data.newResult.data.result;
			if (currentData.length > 0 && currentData[0].list) {
				if (offset === 0) {
					setTraces(currentData[0].list ?? []);
				} else {
					setTraces((prev) => [...prev, ...(currentData[0].list ?? [])]);
				}
			}
		}
	}, [data, offset]);

	if (isLoading && traces.length === 0) {
		return <Skeleton active />;
	}

	return (
		<div className="host-metric-traces">
			<ResizeTable
				tableLayout="fixed"
				pagination={false}
				scroll={{ x: true }}
				loading={isLoading && traces.length === 0}
				dataSource={traces}
				columns={columns}
			/>
			{isLoading && traces.length > 0 && (
				<Skeleton
					style={{
						height: '100%',
						padding: '16px',
					}}
				/>
			)}
		</div>
	);
}

export default HostMetricTraces;
