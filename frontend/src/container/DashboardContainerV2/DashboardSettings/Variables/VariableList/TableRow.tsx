import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { RowProps } from 'antd';
import { GripVertical } from '@signozhq/icons';

/**
 * Sortable table row that injects a drag handle into the `name` cell —
 * matches V1's [DashboardVariableSettings/index.tsx:31](TableRow component).
 */
function TableRow({ children, ...props }: RowProps): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		// @ts-expect-error — antd Table's RowProps doesn't type the data-row-key it injects
		id: props['data-row-key'],
	});

	const style: React.CSSProperties = {
		...props.style,
		transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
		transition,
		...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
	};

	return (
		<tr {...props} ref={setNodeRef} style={style} {...attributes}>
			{React.Children.map(children, (child) => {
				const childElement = child as React.ReactElement;
				if (childElement.key === 'name') {
					return React.cloneElement(childElement, {
						key: 'name-with-drag',
						children: (
							<div className="variable-name-drag">
								<GripVertical
									ref={setActivatorNodeRef as unknown as React.Ref<SVGSVGElement>}
									style={{ touchAction: 'none', cursor: 'move' }}
									size="md"
									{...listeners}
								/>
								{child}
							</div>
						),
					});
				}
				return childElement;
			})}
		</tr>
	);
}

export default TableRow;
