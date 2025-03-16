import './TracesFunnels.styles.scss';

import { useNotifications } from 'hooks/useNotifications';
import { ChangeEvent, useState } from 'react';

import FunnelsList from './components/FunnelsList/FunnelsList';
import Header from './components/Header/Header';
import SearchBar from './components/SearchBar/SearchBar';

interface SortOrder {
	columnKey: string;
	order: 'ascend' | 'descend';
}

function TracesFunnels(): JSX.Element {
	const [searchValue, setSearchValue] = useState<string>('');
	const [sortOrder, setSortOrder] = useState<SortOrder>({
		columnKey: 'updatedAt',
		order: 'descend',
	});

	const { notifications } = useNotifications();

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		// Implement search functionality here
	};

	const handleSort = (key: string): void => {
		setSortOrder({
			columnKey: key,
			order: 'descend',
		});
		// Implement sort functionality here
	};

	const handleDelete = (id: string): void => {
		// Implement delete functionality here
		console.log('delete', id);
		notifications.success({
			message: 'Funnel deleted successfully',
		});
	};
	const handleRename = (id: string): void => {
		// Implement delete functionality here
		console.log('rename', id);
		notifications.success({
			message: 'Funnel renamed successfully',
		});
	};

	// Mock data for now
	// TODO(shaheer): check if we get updated at, and handle sorting based on that
	const funnelsData = [
		{
			id: '28378e4f-1506-4161-8e34-d6ce22cb1b11',
			funnel_name: 'Some funnel for testing',
			creation_timestamp: 1741779728389876000,
			user: 'John Doe',
		},
		{
			id: '28378e4f-1506-4161-8e34-d6ce2sdfb1b11',
			funnel_name: 'Instance Metrics - ECS',
			creation_timestamp: 1741779728389876000,
			user: 'John Doe',
		},
		{
			id: '28378e4f-1506-4161-8e34-34dse22cb1b11',
			funnel_name: 'Another dashboard',
			creation_timestamp: 1741779728389876000,
			user: 'John Doe',
		},
		// ... other funnel data
	];

	return (
		<div className="traces-funnels">
			<div className="traces-funnels__content">
				<Header />
				<SearchBar
					searchValue={searchValue}
					sortOrder={sortOrder}
					onSearch={handleSearch}
					onSort={handleSort}
				/>
				<FunnelsList
					data={funnelsData}
					onDelete={handleDelete}
					onRename={handleRename}
				/>
			</div>
		</div>
	);
}

export default TracesFunnels;
