/* eslint-disable sonarjs/no-duplicate-string */
import './ToolbarActions.styles.scss';

import { FilterOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import cx from 'classnames';
import { Atom, Binoculars, SquareMousePointer, Terminal } from 'lucide-react';
import { ExplorerViews } from 'pages/LogsExplorer/utils';

interface LeftToolbarActionsProps {
	items: any;
	selectedView: string;
	onChangeSelectedView: (view: ExplorerViews) => void;
	showFilter: boolean;
	handleFilterVisibilityChange: () => void;
}

const activeTab = 'active-tab';

export default function LeftToolbarActions({
	items,
	selectedView,
	onChangeSelectedView,
	showFilter,
	handleFilterVisibilityChange,
}: LeftToolbarActionsProps): JSX.Element {
	const { clickhouse, list, timeseries, table, trace } = items;

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
				{list?.show && (
					<Tooltip title="List View">
						<Button
							disabled={list.disabled}
							className={cx(
								'list-view-tab',
								'explorer-view-option',
								selectedView === list.key ? activeTab : '',
							)}
							onClick={(): void => onChangeSelectedView(list.key)}
						>
							<SquareMousePointer size={14} data-testid="search-view" />
							List View
						</Button>
					</Tooltip>
				)}

				{trace?.show && (
					<Tooltip title="Trace View">
						<Button
							disabled={trace.disabled}
							className={cx(
								'trace-view-tab',
								'explorer-view-option',
								selectedView === trace.key ? activeTab : '',
							)}
							onClick={(): void => onChangeSelectedView(trace.key)}
						>
							<SquareMousePointer size={14} data-testid="trace-view" />
							Trace View
						</Button>
					</Tooltip>
				)}

				{timeseries?.show && (
					<Tooltip title="Time Series">
						<Button
							disabled={timeseries.disabled}
							className={cx(
								'timeseries-view-tab',
								'explorer-view-option',
								selectedView === timeseries.key ? activeTab : '',
							)}
							onClick={(): void => onChangeSelectedView(timeseries.key)}
						>
							<Atom size={14} data-testid="query-builder-view" />
							Time Series
						</Button>
					</Tooltip>
				)}

				{clickhouse?.show && (
					<Tooltip title="Clickhouse">
						<Button
							disabled={clickhouse.disabled}
							className={cx(
								'clickhouse-view-tab',
								'explorer-view-option',
								selectedView === clickhouse.key ? activeTab : '',
							)}
							onClick={(): void => onChangeSelectedView(clickhouse.key)}
						>
							<Terminal size={14} data-testid="clickhouse-view" />
							Clickhouse
						</Button>
					</Tooltip>
				)}

				{table?.show && (
					<Tooltip title="Table">
						<Button
							disabled={table.disabled}
							className={cx(
								'table-view-tab',
								'explorer-view-option',
								selectedView === table.key ? activeTab : '',
							)}
							onClick={(): void => onChangeSelectedView(table.key)}
						>
							<Binoculars size={14} data-testid="query-builder-view-v2" />
							Table
						</Button>
					</Tooltip>
				)}
			</div>
		</div>
	);
}
