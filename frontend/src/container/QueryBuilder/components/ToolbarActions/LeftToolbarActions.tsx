import './ToolbarActions.styles.scss';

import { Button, Switch, Typography } from 'antd';
import cx from 'classnames';
import { Atom, MousePointerSquare, Terminal } from 'lucide-react';
import { SELECTED_VIEWS } from 'pages/LogsExplorer/utils';

interface LeftToolbarActionsProps {
	items: any;
	selectedView: string;
	onToggleHistrogramVisibility: () => void;
	onChangeSelectedView: (view: SELECTED_VIEWS) => void;
	showHistogram: boolean;
}

const activeTab = 'active-tab';
const actionBtn = 'action-btn';

export default function LeftToolbarActions({
	items,
	selectedView,
	onToggleHistrogramVisibility,
	onChangeSelectedView,
	showHistogram,
}: LeftToolbarActionsProps): JSX.Element {
	const { clickhouse, search, queryBuilder: QB } = items;

	return (
		<div className="left-toolbar">
			<div className="left-toolbar-query-actions">
				<Button
					disabled={search.disabled}
					className={cx(
						SELECTED_VIEWS.SEARCH,
						actionBtn,
						selectedView === 'search' ? activeTab : '',
					)}
					onClick={(): void => onChangeSelectedView(SELECTED_VIEWS.SEARCH)}
				>
					<MousePointerSquare size={14} />
				</Button>
				<Button
					disabled={QB.disabled}
					className={cx(
						SELECTED_VIEWS.QUERY_BUILDER,
						actionBtn,
						selectedView === SELECTED_VIEWS.QUERY_BUILDER ? activeTab : '',
					)}
					onClick={(): void => onChangeSelectedView(SELECTED_VIEWS.QUERY_BUILDER)}
				>
					<Atom size={14} />
				</Button>

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
						<Terminal size={14} />
					</Button>
				)}
			</div>

			<div className="histogram-view-controller">
				<Typography>Histogram</Typography>
				<Switch
					size="small"
					checked={showHistogram}
					defaultChecked
					onChange={onToggleHistrogramVisibility}
				/>
			</div>
		</div>
	);
}
