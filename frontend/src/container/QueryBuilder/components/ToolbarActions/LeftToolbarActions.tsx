import './ToolbarActions.styles.scss';

import { Button, Switch, Typography } from 'antd';
import { Atom, MousePointerSquare, Terminal } from 'lucide-react';

interface LeftToolbarActionsProps {
	selectedView: string;
	onToggleHistrogramVisibility: () => void;
	showHistogram: boolean;
}

export default function LeftToolbarActions({
	selectedView,
	onToggleHistrogramVisibility,
	showHistogram,
}: LeftToolbarActionsProps): JSX.Element {
	return (
		<div className="left-toolbar">
			<div className="left-toolbar-query-actions">
				<Button
					value="search"
					// eslint-disable-next-line sonarjs/no-duplicate-string
					className={
						// eslint-disable-next-line sonarjs/no-duplicate-string
						selectedView === 'search' ? 'active-tab action-btn' : 'action-btn'
					}
				>
					<MousePointerSquare size={14} />
				</Button>
				<Button
					value="query-builder"
					className={
						selectedView === 'query-builder' ? 'active-tab action-btn' : 'action-btn'
					}
				>
					<Atom size={14} />
				</Button>
				<Button
					value="clickhouse"
					className={
						selectedView === 'clickhouse' ? 'active-tab action-btn' : 'action-btn'
					}
				>
					<Terminal size={14} />
				</Button>
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
