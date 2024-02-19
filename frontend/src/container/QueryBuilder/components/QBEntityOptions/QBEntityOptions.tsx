import './QBEntityOptions.styles.scss';

import { Button } from 'antd';
import cx from 'classnames';
import { ChevronDown, ChevronRight, Eye, EyeOff, Trash2 } from 'lucide-react';
import {
	IBuilderQuery,
	QueryFunctionProps,
} from 'types/api/queryBuilder/queryBuilderData';

import QueryFunctions from '../QueryFunctions/QueryFunctions';

interface QBEntityOptionsProps {
	query?: IBuilderQuery;
	isMetricsDataSource?: boolean;
	isCollapsed: boolean;
	entityType: string;
	entityData: any;
	onDelete: () => void;
	onToggleVisibility: () => void;
	onCollapseEntity: () => void;
	onQueryFunctionsUpdates?: (functions: QueryFunctionProps[]) => void;
	showDeleteButton: boolean;
	isListViewPanel?: boolean;
}

export default function QBEntityOptions({
	query,
	isMetricsDataSource,
	isCollapsed,
	entityType,
	entityData,
	onDelete,
	onToggleVisibility,
	onCollapseEntity,
	showDeleteButton,
	onQueryFunctionsUpdates,
	isListViewPanel,
}: QBEntityOptionsProps): JSX.Element {
	return (
		<div className="qb-entity-options">
			<div className="left-col-items">
				<div className="options periscope-btn-group">
					<Button.Group className="options-group">
						<Button
							value="search"
							className="periscope-btn collapse"
							onClick={onCollapseEntity}
						>
							{isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
						</Button>
						<Button
							value="query-builder"
							className="periscope-btn visibility-toggle"
							onClick={onToggleVisibility}
							disabled={isListViewPanel}
						>
							{entityData.disabled ? <EyeOff size={16} /> : <Eye size={16} />}
						</Button>

						<Button
							className={cx(
								'periscope-btn',
								entityType === 'query' ? 'query-name' : 'formula-name',
							)}
						>
							{entityData.queryName}
						</Button>

						{isMetricsDataSource && query && onQueryFunctionsUpdates && (
							<QueryFunctions
								queryFunctions={query.functions}
								onChange={onQueryFunctionsUpdates}
							/>
						)}
					</Button.Group>
				</div>

				{isCollapsed && (
					<div className="title">
						<span className="entityType"> {entityType} </span> -{' '}
						<span className="entityData"> {entityData.queryName} </span>
					</div>
				)}
			</div>

			{showDeleteButton && (
				<Button className="periscope-btn ghost" onClick={onDelete}>
					<Trash2 size={14} />
				</Button>
			)}
		</div>
	);
}

QBEntityOptions.defaultProps = {
	isListViewPanel: false,
	query: undefined,
	isMetricsDataSource: false,
	onQueryFunctionsUpdates: undefined,
};
