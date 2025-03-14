import { getFormattedDependentServicesData } from 'container/ApiMonitoring/utils';
import { UnfoldVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

interface DependentServicesProps {
	dependentServicesQuery: UseQueryResult<SuccessResponse<any>, unknown>;
}

// need to add a loading state

// discuss slice vs index based rendering
function DependentServices({
	dependentServicesQuery,
}: DependentServicesProps): JSX.Element {
	const { data } = dependentServicesQuery;

	const [currentRenderCount, setCurrentRenderCount] = useState(0);

	const dependentServicesData = useMemo(() => {
		const formattedDependentServicesData = getFormattedDependentServicesData(
			data?.payload?.data?.result[0].table.rows,
		);
		setCurrentRenderCount(Math.min(formattedDependentServicesData.length, 5));
		return formattedDependentServicesData;
	}, [data]);

	const renderItems = useMemo(
		() => dependentServicesData.slice(0, currentRenderCount),
		[currentRenderCount, dependentServicesData],
	);

	return (
		<div className="top-attributes-content">
			<div className="top-attributes-title">
				<span className="title-wrapper">Dependent Services</span>
			</div>
			{renderItems.map((item) => (
				<div className="top-attributes-item" key={item.key}>
					<div className="top-attributes-item-progress">
						<div className="top-attributes-item-key">{item.serviceName}</div>
						<div className="top-attributes-item-count">{item.count}</div>
						<div
							className="top-attributes-item-progress-bar"
							style={{ width: `${item.percentage}%` }}
						/>
					</div>
					<div className="top-attributes-item-percentage">
						{item.percentage.toFixed(2)}%
					</div>
				</div>
			))}

			{currentRenderCount < dependentServicesData.length && (
				<div
					className="top-attributes-load-more"
					onClick={(): void => setCurrentRenderCount(dependentServicesData.length)}
					onKeyDown={(e): void => {
						if (e.key === 'Enter') {
							setCurrentRenderCount(dependentServicesData.length);
						}
					}}
					role="button"
					tabIndex={0}
				>
					<UnfoldVertical size={14} />
					Show more...
				</div>
			)}
		</div>
	);
}

export default DependentServices;
