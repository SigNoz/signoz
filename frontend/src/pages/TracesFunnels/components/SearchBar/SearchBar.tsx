import { Color } from '@signozhq/design-tokens';
import { Button, Input, Popover, Tooltip, Typography } from 'antd';
import { ArrowDownWideNarrow, Check, Plus, Search } from 'lucide-react';
import { ChangeEvent } from 'react';

interface SearchBarProps {
	searchQuery: string;
	sortOrder: {
		columnKey: string;
		order: 'ascend' | 'descend';
	};
	onSearch: (e: ChangeEvent<HTMLInputElement>) => void;
	onSort: (key: string) => void;
}

function SearchBar({
	searchQuery,
	sortOrder,
	onSearch,
	onSort,
}: SearchBarProps): JSX.Element {
	return (
		<div className="search">
			<Tooltip title="Sort">
				<Popover
					trigger="click"
					content={
						<div className="sort-popover-content">
							<Typography.Text className="sort-popover-content__heading">
								Sort By
							</Typography.Text>
							<Button
								type="text"
								className="sort-popover-content__button"
								onClick={(): void => onSort('creation_timestamp')}
							>
								Last created
								{sortOrder.columnKey === 'creation_timestamp' && <Check size={14} />}
							</Button>
							<Button
								type="text"
								className="sort-popover-content__button"
								onClick={(): void => onSort('update_timestamp')}
							>
								Last updated
								{sortOrder.columnKey === 'update_timestamp' && <Check size={14} />}
							</Button>
						</div>
					}
					rootClassName="sort-popover"
					placement="bottomRight"
					arrow={false}
				>
					<Button type="text" className="search__sort-btn">
						<ArrowDownWideNarrow size={12} data-testid="sort-by" />
						<div className="search__sort-btn-text">Sort</div>
					</Button>
				</Popover>
			</Tooltip>
			<Input
				className="search__input"
				placeholder="Search by name, description, or tags..."
				prefix={
					<Search
						size={12}
						color={Color.BG_VANILLA_400}
						style={{ opacity: '0.4' }}
					/>
				}
				value={searchQuery}
				onChange={onSearch}
			/>
			<Button type="primary" icon={<Plus size={16} />} className="search__new-btn">
				New funnel
			</Button>
		</div>
	);
}

export default SearchBar;
