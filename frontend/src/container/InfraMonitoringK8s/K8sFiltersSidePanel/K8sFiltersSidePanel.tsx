import './K8sFiltersSidePanel.styles.scss';

import { Button, Input } from 'antd';
import { GripVertical, TableColumnsSplit, X } from 'lucide-react';
import { useRef, useState } from 'react';

export default function K8sFiltersSidePanel({
	onClose,
	addedColumns,
	availableColumns,
}: {
	onClose: () => void;
	addedColumns: string[];
	availableColumns: string[];
}): JSX.Element {
	const [searchValue, setSearchValue] = useState('');
	const sidePanelRef = useRef<HTMLDivElement>(null);

	return (
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
						className="periscope-input borderless"
						placeholder="Search for a column ..."
						value={searchValue}
						onChange={(e): void => setSearchValue(e.target.value)}
					/>
				</div>

				<div className="k8s-filters-side-panel-body-content">
					<div className="added-columns">
						<div className="filter-columns-title">Added Columns</div>

						<div className="added-columns-list">
							{addedColumns.map((column) => (
								<div className="added-column-item" key={column}>
									<GripVertical size={16} /> {column}
								</div>
							))}
						</div>
					</div>

					<div className="horizontal-divider" />

					<div className="available-columns">
						<div className="filter-columns-title">Other Columns</div>

						<div className="available-columns-list">
							{availableColumns.map((column) => (
								<div className="available-column-item" key={column}>
									<GripVertical size={16} /> {column}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
