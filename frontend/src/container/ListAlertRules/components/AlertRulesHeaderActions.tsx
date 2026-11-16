import type { MouseEvent } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { ColumnSelector } from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView';
import TextToolTip from 'components/TextToolTip';

import type { AlertRule } from '../types';

import styles from './AlertRulesHeaderActions.module.scss';

interface Props {
	columns: TableColumnDef<AlertRule>[];
	canAddAlert: boolean;
	onNewAlert: (e: MouseEvent) => void;
}

function AlertRulesHeaderActions({
	columns,
	canAddAlert,
	onNewAlert,
}: Props): JSX.Element {
	return (
		<div className={styles.actions}>
			<ColumnSelector
				columns={columns}
				storageKey="alert-rules-columns"
				testId="alert-columns-button"
			/>
			{canAddAlert && (
				<Button
					variant="solid"
					size="sm"
					prefix={<Plus size={14} />}
					onClick={onNewAlert}
					color="primary"
					testId="list-alerts-new-alert-button"
				>
					New Alert
				</Button>
			)}
			<TextToolTip
				text="More details on how to create alerts"
				url="https://signoz.io/docs/alerts/?utm_source=product&utm_medium=list-alerts"
				urlText="Learn More"
			/>
		</div>
	);
}

export default AlertRulesHeaderActions;
