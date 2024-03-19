import {
	DndContext,
	DragEndEvent,
	MouseSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { useEffect, useState } from 'react';

import ExplorerOptions, { ExplorerOptionsProps } from './ExplorerOptions';
import {
	getExplorerToolBarVisibility,
	setExplorerToolBarVisibility,
} from './utils';

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
	const [isExplorerOptionHidden, setIsExplorerOptionHidden] = useState(false);

	useEffect(() => {
		const toolbarVisibility = getExplorerToolBarVisibility(sourcepage);
		setIsExplorerOptionHidden(!toolbarVisibility);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;
		if (
			over !== null &&
			active.id === 'explorer-options-draggable' &&
			over.id === 'explorer-options-droppable'
		) {
			setIsExplorerOptionHidden(true);
			setExplorerToolBarVisibility(false, sourcepage);
		}
	};

	const mouseSensor = useSensor(MouseSensor, {
		// Require the mouse to move by 5 pixels before activating
		activationConstraint: {
			distance: 5,
		},
	});

	const sensors = useSensors(mouseSensor);

	return (
		<DndContext onDragEnd={handleDragEnd} sensors={sensors}>
			<ExplorerOptions
				disabled={disabled}
				query={query}
				isLoading={isLoading}
				onExport={onExport}
				sourcepage={sourcepage}
				isExplorerOptionHidden={isExplorerOptionHidden}
				setIsExplorerOptionHidden={setIsExplorerOptionHidden}
			/>
		</DndContext>
	);
}

export default ExplorerOptionWrapper;
