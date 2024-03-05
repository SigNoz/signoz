import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';

import ExplorerOptions, { ExplorerOptionsProps } from './ExplorerOptions';

type ExplorerOptionsWrapperProps = Omit<
	ExplorerOptionsProps,
	'isExplorerOptionDrop'
>;

function ExplorerOptionWrapper({
	disabled,
	query,
	isLoading,
	onExport,
	sourcepage,
}: ExplorerOptionsWrapperProps): JSX.Element {
	const [isExplorerOptionDrop, setIsExplorerOptionDrop] = useState(false);

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;
		if (
			over !== null &&
			active.id === 'explorer-options-draggable' &&
			over.id === 'explorer-options-droppable'
		) {
			setIsExplorerOptionDrop(true);
		}
	};
	return (
		<DndContext onDragEnd={handleDragEnd}>
			<ExplorerOptions
				disabled={disabled}
				query={query}
				isLoading={isLoading}
				onExport={onExport}
				sourcepage={sourcepage}
				isExplorerOptionDrop={isExplorerOptionDrop}
				setIsExplorerOptionDrop={setIsExplorerOptionDrop}
			/>
		</DndContext>
	);
}

export default ExplorerOptionWrapper;
