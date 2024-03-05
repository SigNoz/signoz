/* eslint-disable no-nested-ternary */
import './ExplorerOptionsDroppableArea.styles.scss';

import { useDroppable } from '@dnd-kit/core';
import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Disc3, X } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';

interface DroppableAreaProps {
	isQueryUpdated: boolean;
	isExplorerOptionDrop?: boolean;
	setIsExplorerOptionDrop?: Dispatch<SetStateAction<boolean>>;
	handleClearSelect: () => void;
	onUpdateQueryHandler: () => void;
}

function ExplorerOptionsDroppableArea({
	isQueryUpdated,
	isExplorerOptionDrop,
	setIsExplorerOptionDrop,
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
				? Color.BG_SLATE_300
				: Color.BG_VANILLA_300
			: undefined,
		opacity: isOver ? 0.9 : 1,
	};

	const handleShowExplorerOption = (): void => {
		if (setIsExplorerOptionDrop) {
			setIsExplorerOptionDrop(false);
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
			{isExplorerOptionDrop && (
				<>
					{isQueryUpdated && (
						<div className="explorer-actions-btn">
							<Button
								onClick={handleClearSelect}
								className="action-btn"
								style={{ background: Color.BG_CHERRY_500 }}
								icon={<X size={14} color={Color.BG_INK_500} />}
							/>
							<Button
								onClick={onUpdateQueryHandler}
								className="action-btn"
								style={{ background: Color.BG_ROBIN_500 }}
								icon={<Disc3 size={14} color={Color.BG_INK_500} />}
							/>
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
	isExplorerOptionDrop: undefined,
	setIsExplorerOptionDrop: undefined,
};

export default ExplorerOptionsDroppableArea;
