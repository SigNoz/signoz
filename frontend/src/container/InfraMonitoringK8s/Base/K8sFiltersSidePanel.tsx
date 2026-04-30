import { Button, DrawerWrapper } from '@signozhq/ui';

import { InfraMonitoringEntity } from '../constants';
import {
	useInfraMonitoringTableColumnsForPage,
	useInfraMonitoringTableColumnsStore,
} from './useInfraMonitoringTableColumnsStore';

import styles from './K8sFiltersSidePanel.module.scss';

function K8sFiltersSidePanel({
	open,
	onClose,
	entity,
}: {
	open: boolean;
	onClose: () => void;
	entity: InfraMonitoringEntity;
}): JSX.Element {
	const addColumn = useInfraMonitoringTableColumnsStore(
		(state) => state.addColumn,
	);
	const removeColumn = useInfraMonitoringTableColumnsStore(
		(state) => state.removeColumn,
	);

	const [columns, columnsHidden] = useInfraMonitoringTableColumnsForPage(entity);

	const drawerContent = (
		<>
			<div className={styles.columnsTitle}>Added Columns (Click to remove)</div>

			<div className={styles.columnsList}>
				{columns
					.filter(
						(column) =>
							!columnsHidden.includes(column.id) &&
							column.behavior !== 'hidden-on-collapse',
					)
					.map((column) => (
						<div className={styles.columnItem} key={column.value}>
							{/*<GripVertical size={16} /> TODO: Add support back when update the table component */}
							<Button
								variant="ghost"
								color="none"
								className={styles.columnItem}
								disabled={!column.canBeHidden}
								data-testid={`remove-column-${column.id}`}
								onClick={(): void => removeColumn(entity, column.id)}
							>
								{column.label}
							</Button>
						</div>
					))}
			</div>

			<div className={styles.horizontalDivider} />

			<div className={styles.columnsTitle}>Other Columns (Click to add)</div>

			<div className={styles.columnsList}>
				{columns
					.filter((column) => columnsHidden.includes(column.id))
					.map((column) => (
						<div className={styles.columnItem} key={column.value}>
							<Button
								variant="ghost"
								color="none"
								className={styles.columnItem}
								data-can-be-added="true"
								data-testid={`add-column-${column.id}`}
								onClick={(): void => addColumn(entity, column.id)}
								tabIndex={0}
							>
								{column.label}
							</Button>
						</div>
					))}
			</div>
		</>
	);

	return (
		<DrawerWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title="Columns"
			direction="right"
			showCloseButton
			showOverlay={false}
			className={styles.drawer}
		>
			{drawerContent}
		</DrawerWrapper>
	);
}

export default K8sFiltersSidePanel;
