import { ArrowUpToLine, Filter } from '@signozhq/icons';
import { Button, Tooltip } from 'antd';
import cx from 'classnames';
import { ExplorerViews } from 'pages/LogsExplorer/utils';

import { TOOLBAR_VIEW_CONFIG } from './toolbarViewsConfig';

import 'container/QueryBuilder/components/ToolbarActions/ToolbarActions.styles.scss';

/** Labels and icons come from TOOLBAR_VIEW_CONFIG, keyed by `key`. */
interface ToolbarViewItem {
	name: string;
	key: string;
	show?: boolean;
	disabled?: boolean;
}

interface LeftToolbarActionsProps {
	items: Record<string, ToolbarViewItem>;
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
	return (
		<div className="left-toolbar">
			{!showFilter && (
				<Tooltip title="Show Filters">
					<Button onClick={handleFilterVisibilityChange} className="filter-btn">
						<Filter size={12} />
						<ArrowUpToLine size={12} style={{ transform: 'rotate(90deg)' }} />
					</Button>
				</Tooltip>
			)}
			{/* Buttons render in the order the caller declares its views. */}
			<div className="left-toolbar-query-actions">
				{Object.values(items).map((item) => {
					const config = TOOLBAR_VIEW_CONFIG[item?.key];

					if (!item?.show || !config) {
						return null;
					}

					const { icon: Icon, label, className, testId } = config;

					return (
						<Tooltip key={item.key} title={label}>
							<Button
								disabled={item.disabled}
								className={cx(
									className,
									'explorer-view-option',
									selectedView === item.key ? activeTab : '',
								)}
								onClick={(): void => onChangeSelectedView(item.key as ExplorerViews)}
							>
								<Icon size={14} data-testid={testId} />
								{label}
							</Button>
						</Tooltip>
					);
				})}
			</div>
		</div>
	);
}
