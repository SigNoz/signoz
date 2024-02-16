import './QBEntityOptions.styles.scss';

import { Button, Col } from 'antd';
import cx from 'classnames';
import { ChevronDown, ChevronRight, Eye, EyeOff, Trash2 } from 'lucide-react';

interface QBEntityOptionsProps {
	isCollapsed: boolean;
	entityType: string;
	entityData: any;
	onDelete: () => void;
	onToggleVisibility: () => void;
	onCollapseEntity: () => void;
	showDeleteButton: boolean;
	isExplorerPanel?: boolean;
}

export default function QBEntityOptions({
	isCollapsed,
	entityType,
	entityData,
	onDelete,
	onToggleVisibility,
	onCollapseEntity,
	showDeleteButton,
	isExplorerPanel = false,
}: QBEntityOptionsProps): JSX.Element {
	return (
		<Col span={24}>
			<div className="qb-entity-options">
				<div className="left-col-items">
					<div className="options periscope-btn-group">
						<Button.Group>
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
								disabled={isExplorerPanel}
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
		</Col>
	);
}

QBEntityOptions.defaultProps = {
	isExplorerPanel: false,
};
