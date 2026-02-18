import React from 'react';
import { Color } from '@signozhq/design-tokens';
import cx from 'classnames';

import { SPACEKEY } from './utils';

export interface CustomMultiSelectTagProps {
	label: React.ReactNode;
	closable: boolean;
	onClose: () => void;
	isActive: boolean;
	isSelected: boolean;
}

export function CustomMultiSelectTag({
	label,
	closable,
	onClose,
	isActive,
	isSelected,
}: CustomMultiSelectTagProps): React.ReactElement {
	const handleTagKeyDown = (e: React.KeyboardEvent): void => {
		if (e.key === 'Enter' || e.key === SPACEKEY) {
			e.stopPropagation();
			e.preventDefault();
			onClose();
		}
	};

	return (
		<div
			className={cx('ant-select-selection-item', {
				'ant-select-selection-item-active': isActive,
				'ant-select-selection-item-selected': isSelected,
			})}
			style={
				isActive || isSelected
					? {
							borderColor: Color.BG_ROBIN_500,
							backgroundColor: Color.BG_SLATE_400,
					  }
					: undefined
			}
		>
			<span className="ant-select-selection-item-content">{label}</span>
			{closable && (
				<span
					className="ant-select-selection-item-remove"
					onClick={onClose}
					onKeyDown={handleTagKeyDown}
					role="button"
					tabIndex={0}
					aria-label={`Remove tag ${label}`}
				>
					×
				</span>
			)}
		</div>
	);
}
