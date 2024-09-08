import './ToolbarActions.styles.scss';

import { FilterOutlined } from '@ant-design/icons';
import { Button, Switch, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { Atom, SquareMousePointer, Terminal } from 'lucide-react';
import { SELECTED_VIEWS } from 'pages/LogsExplorer/utils';

interface LeftToolbarActionsProps {
	items: any;
	selectedView: string;
	onToggleHistrogramVisibility: () => void;
	onChangeSelectedView: (view: SELECTED_VIEWS) => void;
	showFrequencyChart: boolean;
	showFilter: boolean;
	handleFilterVisibilityChange: () => void;
}

const activeTab = 'active-tab';
const actionBtn = 'action-btn';
export const queryBuilder = 'query-builder';

export default function LeftToolbarActions({
	items,
	selectedView,
	onToggleHistrogramVisibility,
	onChangeSelectedView,
	showFrequencyChart,
	showFilter,
	handleFilterVisibilityChange,
}: LeftToolbarActionsProps): JSX.Element {
	const { clickhouse, search, queryBuilder: QB } = items;

	return (
		<div className="left-toolbar">
			{!showFilter && (
				<Tooltip title="Show Filters">
					<Button onClick={handleFilterVisibilityChange} className="filter-btn">
						<FilterOutlined />
					</Button>
				</Tooltip>
			)}
			<div className="left-toolbar-query-actions">
				<Tooltip title="Search">
					<Button
						disabled={search.disabled}
						className={cx(
							'search',
							actionBtn,
							selectedView === 'search' ? activeTab : '',
						)}
						onClick={(): void => onChangeSelectedView(SELECTED_VIEWS.SEARCH)}
					>
						<SquareMousePointer size={14} data-testid="search-view" />
					</Button>
				</Tooltip>
				<Tooltip title="Query Builder">
					<Button
						disabled={QB.disabled}
						className={cx(
							queryBuilder,
							actionBtn,
							selectedView === queryBuilder ? activeTab : '',
						)}
						onClick={(): void => onChangeSelectedView(SELECTED_VIEWS.QUERY_BUILDER)}
					>
						<Atom size={14} data-testid="query-builder-view" />
					</Button>
				</Tooltip>

				{clickhouse?.show && (
					<Button
						disabled={clickhouse.disabled}
						className={cx(
							SELECTED_VIEWS.CLICKHOUSE,
							actionBtn,
							selectedView === SELECTED_VIEWS.CLICKHOUSE ? activeTab : '',
						)}
						onClick={(): void => onChangeSelectedView(SELECTED_VIEWS.CLICKHOUSE)}
					>
						<Terminal size={14} data-testid="clickhouse-view" />
					</Button>
				)}
			</div>

			<div className="frequency-chart-view-controller">
				<Typography>Frequency chart</Typography>
				<Switch
					size="small"
					checked={showFrequencyChart}
					defaultChecked
					onChange={onToggleHistrogramVisibility}
				/>
			</div>
		</div>
	);
}
