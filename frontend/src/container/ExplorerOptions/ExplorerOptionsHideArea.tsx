/* eslint-disable no-nested-ternary */
import './ExplorerOptionsHideArea.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Tooltip } from 'antd';
import { Disc3, X } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { setExplorerToolBarVisibility } from './utils';

interface DroppableAreaProps {
	viewName: string;
	isQueryUpdated: boolean;
	isExplorerOptionHidden?: boolean;
	sourcepage: DataSource;
	setIsExplorerOptionHidden?: Dispatch<SetStateAction<boolean>>;
	handleClearSelect: () => void;
	onUpdateQueryHandler: () => void;
	isEditDeleteSupported: boolean;
}

function ExplorerOptionsHideArea({
	viewName,
	isQueryUpdated,
	isExplorerOptionHidden,
	sourcepage,
	setIsExplorerOptionHidden,
	handleClearSelect,
	onUpdateQueryHandler,
	isEditDeleteSupported,
}: DroppableAreaProps): JSX.Element {
	const handleShowExplorerOption = (): void => {
		if (setIsExplorerOptionHidden) {
			setIsExplorerOptionHidden(false);
			setExplorerToolBarVisibility(true, sourcepage);
		}
	};

	return (
		<div className="explorer-option-droppable-container">
			{isExplorerOptionHidden && (
				<>
					{viewName && (
						<div className="explorer-actions-btn">
							<Tooltip title="Clear this view">
								<Button
									onClick={handleClearSelect}
									className="action-btn"
									style={{ background: Color.BG_CHERRY_500 }}
									icon={<X size={14} color={Color.BG_INK_500} />}
								/>
							</Tooltip>
							{isEditDeleteSupported && isQueryUpdated && (
								<Tooltip title="Update this View">
									<Button
										onClick={onUpdateQueryHandler}
										className="action-btn"
										style={{ background: Color.BG_ROBIN_500 }}
										icon={<Disc3 size={14} color={Color.BG_INK_500} />}
									/>
								</Tooltip>
							)}
						</div>
					)}
					<Button
						// style={{ alignSelf: 'center', marginRight: 'calc(10% - 20px)' }}
						className="explorer-show-btn"
						onClick={handleShowExplorerOption}
						data-testid="show-explorer-option"
					>
						<div className="menu-bar" />
					</Button>
				</>
			)}
		</div>
	);
}

ExplorerOptionsHideArea.defaultProps = {
	isExplorerOptionHidden: undefined,
	setIsExplorerOptionHidden: undefined,
};

export default ExplorerOptionsHideArea;
