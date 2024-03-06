/* eslint-disable no-nested-ternary */
import './ExplorerOptionsDroppableArea.styles.scss';

import { useDroppable } from '@dnd-kit/core';
import { Color } from '@signozhq/design-tokens';
import { Button, Tooltip } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Disc3, X } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { setExplorerToolBarVisibility } from './utils';

interface DroppableAreaProps {
	isQueryUpdated: boolean;
	isExplorerOptionHidden?: boolean;
	sourcepage: DataSource;
	setIsExplorerOptionHidden?: Dispatch<SetStateAction<boolean>>;
	handleClearSelect: () => void;
	onUpdateQueryHandler: () => void;
}

function ExplorerOptionsDroppableArea({
	isQueryUpdated,
	isExplorerOptionHidden,
	sourcepage,
	setIsExplorerOptionHidden,
	handleClearSelect,
	onUpdateQueryHandler,
}: DroppableAreaProps): JSX.Element {
	const { isOver, setNodeRef } = useDroppable({
		id: 'explorer-options-droppable',
	});

	const isDarkMode = useIsDarkMode();

	const style = {
		backgroundColor: isOver
			? isDarkMode
				? 'rgba(255, 0, 0, 0.20)'
				: Color.BG_VANILLA_300
			: undefined,
	};

	const handleShowExplorerOption = (): void => {
		if (setIsExplorerOptionHidden) {
			setIsExplorerOptionHidden(false);
			setExplorerToolBarVisibility(true, sourcepage);
		}
	};

	return (
		<div
			ref={setNodeRef}
			className="explorer-option-droppable-container"
			style={{
				...style,
			}}
		>
			{isExplorerOptionHidden && (
				<>
					{isQueryUpdated && (
						<div className="explorer-actions-btn">
							<Tooltip title="Clear this view">
								<Button
									onClick={handleClearSelect}
									className="action-btn"
									style={{ background: Color.BG_CHERRY_500 }}
									icon={<X size={14} color={Color.BG_INK_500} />}
								/>
							</Tooltip>
							<Tooltip title="Update this View">
								<Button
									onClick={onUpdateQueryHandler}
									className="action-btn"
									style={{ background: Color.BG_ROBIN_500 }}
									icon={<Disc3 size={14} color={Color.BG_INK_500} />}
								/>
							</Tooltip>
						</div>
					)}
					<Button
						// style={{ alignSelf: 'center', marginRight: 'calc(10% - 20px)' }}
						className="explorer-show-btn"
						onClick={handleShowExplorerOption}
					>
						<div className="menu-bar" />
					</Button>
				</>
			)}
		</div>
	);
}

ExplorerOptionsDroppableArea.defaultProps = {
	isExplorerOptionHidden: undefined,
	setIsExplorerOptionHidden: undefined,
};

export default ExplorerOptionsDroppableArea;
