/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './K8sFiltersSidePanel.styles.scss';

import { Button, Input } from 'antd';
import { GripVertical, TableColumnsSplit, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { IEntityColumn } from '../utils';

function K8sFiltersSidePanel({
	defaultAddedColumns,
	onClose,
	addedColumns = [],
	availableColumns = [],
	onAddColumn = () => {},
	onRemoveColumn = () => {},
}: {
	defaultAddedColumns: IEntityColumn[];
	onClose: () => void;
	addedColumns?: IEntityColumn[];
	availableColumns?: IEntityColumn[];
	onAddColumn?: (column: IEntityColumn) => void;
	onRemoveColumn?: (column: IEntityColumn) => void;
}): JSX.Element {
	const [searchValue, setSearchValue] = useState('');
	const sidePanelRef = useRef<HTMLDivElement>(null);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
	};

	useEffect(() => {
		if (sidePanelRef.current) {
			sidePanelRef.current.focus();
		}
	}, [searchValue]);

	// Close side panel when clicking outside of it
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				sidePanelRef.current &&
				!sidePanelRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="k8s-filters-side-panel-container">
			<div className="k8s-filters-side-panel" ref={sidePanelRef}>
				<div className="k8s-filters-side-panel-header">
					<span className="k8s-filters-side-panel-header-title">
						<TableColumnsSplit size={16} /> Columns
					</span>

					<Button
						className="periscope-btn ghost"
						icon={<X size={14} strokeWidth={1.5} onClick={onClose} />}
					/>
				</div>

				<div className="k8s-filters-side-panel-body">
					<div className="k8s-filters-side-panel-body-header">
						<Input
							autoFocus
							className="periscope-input borderless"
							placeholder="Search for a column ..."
							value={searchValue}
							onChange={handleSearchChange}
						/>
					</div>

					<div className="k8s-filters-side-panel-body-content">
						<div className="added-columns">
							<div className="filter-columns-title">Added Columns</div>

							<div className="added-columns-list">
								{[...defaultAddedColumns, ...addedColumns]
									.filter((column) =>
										column.label.toLowerCase().includes(searchValue.toLowerCase()),
									)
									.map((column) => (
										<div className="added-column-item" key={column.value}>
											<div className="added-column-item-content">
												<GripVertical size={16} /> {column.label}
											</div>

											{column.canRemove && (
												<X
													size={14}
													strokeWidth={1.5}
													onClick={(): void => onRemoveColumn(column)}
												/>
											)}
										</div>
									))}
							</div>
						</div>

						<div className="horizontal-divider" />

						<div className="available-columns">
							<div className="filter-columns-title">Other Columns</div>

							<div className="available-columns-list">
								{availableColumns
									.filter((column) =>
										column.label.toLowerCase().includes(searchValue.toLowerCase()),
									)
									.map((column) => (
										<div
											className="available-column-item"
											key={column.value}
											onClick={(): void => onAddColumn(column)}
										>
											<div className="available-column-item-content">
												<GripVertical size={16} /> {column.label}
											</div>
										</div>
									))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

K8sFiltersSidePanel.defaultProps = {
	addedColumns: [],
	availableColumns: [],
	onAddColumn: () => {},
	onRemoveColumn: () => {},
};

export default K8sFiltersSidePanel;
