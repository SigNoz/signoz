import './TracesFunnels.styles.scss';

import { Skeleton } from 'antd';
import { useFunnelsList } from 'hooks/TracesFunnels/useFunnels';
import useHandleTraceFunnelsSearch from 'hooks/TracesFunnels/useHandleTraceFunnelsSearch';
import useHandleTraceFunnelsSort from 'hooks/TracesFunnels/useHandleTraceFunnelsSort';
import { useState } from 'react';
import { FunnelData } from 'types/api/traceFunnels';

import CreateFunnel from './components/CreateFunnel/CreateFunnel';
import FunnelsEmptyState from './components/FunnelsEmptyState/FunnelsEmptyState';
import FunnelsList from './components/FunnelsList/FunnelsList';
import Header from './components/Header/Header';
import SearchBar from './components/SearchBar/SearchBar';
import { filterFunnelsByQuery } from './utils';

interface TracesFunnelsContentRendererProps {
	isLoading: boolean;
	isError: boolean;
	data: FunnelData[];
	onCreateFunnel?: () => void;
	onFunnelClick?: (funnel: FunnelData) => void;
	shouldRedirectToTracesListOnDeleteSuccess?: boolean;
}
export function TracesFunnelsContentRenderer({
	isLoading,
	isError,
	data,
	onCreateFunnel,
	onFunnelClick,
	shouldRedirectToTracesListOnDeleteSuccess,
}: TracesFunnelsContentRendererProps): JSX.Element {
	if (isLoading) {
		return (
			<div className="traces-funnels__loading">
				{Array(2)
					.fill(0)
					.map((item, index) => (
						<Skeleton.Button
							// eslint-disable-next-line react/no-array-index-key
							key={`skeleton-item ${index}`}
							active
							size="large"
							shape="default"
							block
							className="traces-funnels__loading-skeleton"
						/>
					))}
			</div>
		);
	}

	if (isError) {
		return <div>Something went wrong</div>;
	}

	if (data.length === 0 && onCreateFunnel) {
		return <FunnelsEmptyState onCreateFunnel={onCreateFunnel} />;
	}

	return (
		<FunnelsList
			data={data}
			onFunnelClick={onFunnelClick}
			shouldRedirectToTracesListOnDeleteSuccess={
				shouldRedirectToTracesListOnDeleteSuccess
			}
		/>
	);
}

TracesFunnelsContentRenderer.defaultProps = {
	onCreateFunnel: undefined,
	onFunnelClick: undefined,
	shouldRedirectToTracesListOnDeleteSuccess: true,
};

function TracesFunnels(): JSX.Element {
	const { searchQuery, handleSearch } = useHandleTraceFunnelsSearch();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
	const { data, isLoading, isError } = useFunnelsList();

	const { sortOrder, handleSort, sortedData } = useHandleTraceFunnelsSort({
		data: data?.payload || [],
	});

	const filteredData = filterFunnelsByQuery(sortedData, searchQuery);

	const handleCreateFunnel = (): void => {
		setIsCreateModalOpen(true);
	};

	return (
		<div className="traces-funnels">
			<div className="traces-funnels__content">
				<Header />
				<SearchBar
					searchQuery={searchQuery}
					sortOrder={sortOrder}
					onSearch={handleSearch}
					onSort={handleSort}
					onCreateFunnel={handleCreateFunnel}
				/>
				<TracesFunnelsContentRenderer
					isError={isError}
					isLoading={isLoading}
					data={filteredData}
					onCreateFunnel={handleCreateFunnel}
				/>
				<CreateFunnel
					isOpen={isCreateModalOpen}
					onClose={(): void => setIsCreateModalOpen(false)}
				/>
			</div>
		</div>
	);
}

export default TracesFunnels;
