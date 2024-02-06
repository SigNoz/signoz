import './ToolbarActions.styles.scss';

import { Button, Switch, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { Atom, MousePointerSquare, Terminal } from 'lucide-react';

interface LeftToolbarActionsProps {
	items: any;
	selectedView: string;
	onToggleHistrogramVisibility: () => void;
	onChangeSelectedView: (view: string) => void;
	showHistogram: boolean;
}

const activeTab = 'active-tab';
const actionBtn = 'action-btn';
export const queryBuilder = 'query-builder';

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
				<Tooltip title="Search">
					<Button
						disabled={search.disabled}
						className={cx(
							'search',
							actionBtn,
							selectedView === 'search' ? activeTab : '',
						)}
						onClick={(): void => onChangeSelectedView('search')}
					>
						<MousePointerSquare size={14} />
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
						onClick={(): void => onChangeSelectedView(queryBuilder)}
					>
						<Atom size={14} />
					</Button>
				</Tooltip>

				{clickhouse?.show && (
					<Button
						disabled={clickhouse.disabled}
						className={cx(
							'clickhouse',
							actionBtn,
							selectedView === 'clickhouse' ? activeTab : '',
						)}
						onClick={(): void => onChangeSelectedView('clickhouse')}
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
