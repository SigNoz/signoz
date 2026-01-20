/* eslint-disable sonarjs/no-duplicate-string */
import './QBEntityOptions.styles.scss';

import { Button, Col, Tooltip } from 'antd';
import { noop } from 'antd/lib/_util/warning';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { isFunction } from 'lodash-es';
import {
	ChevronDown,
	ChevronRight,
	Copy,
	Eye,
	EyeOff,
	Trash2,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { QueryFunction } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import { DataSourceDropdown } from '..';
import QueryFunctions from '../QueryFunctions/QueryFunctions';

interface QBEntityOptionsProps {
	query?: IBuilderQuery;
	isMetricsDataSource?: boolean;
	showFunctions?: boolean;
	isCollapsed: boolean;
	entityType: string;
	entityData: any;
	onDelete?: () => void;
	onCloneQuery?: (type: string, query: IBuilderQuery) => void;
	onToggleVisibility: () => void;
	onCollapseEntity: () => void;
	onQueryFunctionsUpdates?: (functions: QueryFunction[]) => void;
	showDeleteButton?: boolean;
	showCloneOption?: boolean;
	isListViewPanel?: boolean;
	index?: number;
	showTraceOperator?: boolean;
	hasTraceOperator?: boolean;
	queryVariant?: 'dropdown' | 'static';
	onChangeDataSource?: (value: DataSource) => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function QBEntityOptions({
	query,
	isMetricsDataSource,
	isCollapsed,
	showFunctions,
	entityType,
	entityData,
	onToggleVisibility,
	onCollapseEntity,
	onQueryFunctionsUpdates,
	isListViewPanel,
	onDelete,
	showDeleteButton,
	showCloneOption,
	onCloneQuery,
	index,
	queryVariant,
	hasTraceOperator = false,
	showTraceOperator = false,
	onChangeDataSource,
}: QBEntityOptionsProps): JSX.Element {
	const handleCloneEntity = (): void => {
		if (isFunction(onCloneQuery)) {
			onCloneQuery(entityType, entityData);
		}
	};

	const { pathname } = useLocation();

	const isLogsExplorerPage = pathname === ROUTES.LOGS_EXPLORER;

	const { lastUsedQuery } = useQueryBuilder();

	const isLogsDataSource = query?.dataSource === DataSource.LOGS;

	return (
		<Col span={24}>
			<div className="qb-entity-options">
				<div className="left-col-items">
					<div className="options periscope-btn-group">
						<Button.Group>
							<Tooltip title={isCollapsed ? 'Uncollapse' : 'Collapse'}>
								<Button
									value="search"
									className="periscope-btn collapse"
									onClick={onCollapseEntity}
								>
									{isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
								</Button>
							</Tooltip>
							<Tooltip title={entityData.disabled ? 'Show' : 'Hide'}>
								<Button
									value="query-builder"
									className="periscope-btn visibility-toggle"
									onClick={onToggleVisibility}
									disabled={isListViewPanel && !showTraceOperator}
								>
									{entityData.disabled ? <EyeOff size={16} /> : <Eye size={16} />}
								</Button>
							</Tooltip>

							{entityType === 'query' && showCloneOption && (
								<Tooltip title={`Clone Query ${entityData.queryName}`}>
									<Button className={cx('periscope-btn')} onClick={handleCloneEntity}>
										<Copy size={14} />
									</Button>
								</Tooltip>
							)}

							<Button
								className={cx(
									'periscope-btn',
									entityType === 'query' ? 'query-name' : 'formula-name',
									query?.dataSource === DataSource.TRACES &&
										(hasTraceOperator || (showTraceOperator && isListViewPanel))
										? 'has-trace-operator'
										: '',
									isLogsExplorerPage && lastUsedQuery === index ? 'sync-btn' : '',
								)}
							>
								{entityData.queryName}
							</Button>

							{queryVariant === 'dropdown' && (
								<div className="query-data-source">
									<DataSourceDropdown
										onChange={(value): void => {
											if (onChangeDataSource) {
												onChangeDataSource(value);
											}
										}}
										value={query?.dataSource || DataSource.METRICS}
										isListViewPanel={isListViewPanel}
										className="query-data-source-dropdown"
									/>
								</div>
							)}

							{showFunctions &&
								!isListViewPanel &&
								(isMetricsDataSource || isLogsDataSource) &&
								query &&
								onQueryFunctionsUpdates && (
									<QueryFunctions
										query={query}
										queryFunctions={query.functions || []}
										key={query.functions?.toString()}
										onChange={onQueryFunctionsUpdates}
										maxFunctions={isLogsDataSource ? 1 : 3}
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

				{showDeleteButton && !isListViewPanel && (
					<Button className="periscope-btn ghost" onClick={onDelete}>
						<Trash2 size={14} />
					</Button>
				)}
			</div>
		</Col>
	);
}

QBEntityOptions.defaultProps = {
	isListViewPanel: false,
	query: undefined,
	isMetricsDataSource: false,
	onQueryFunctionsUpdates: undefined,
	showFunctions: false,
	onCloneQuery: noop,
	index: 0,
	onDelete: noop,
	showDeleteButton: false,
	showCloneOption: true,
	queryVariant: 'static',
	onChangeDataSource: noop,
	hasTraceOperator: false,
	showTraceOperator: false,
};
