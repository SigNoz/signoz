import type { MouseEvent } from 'react';
import { Plus } from '@signozhq/icons';
import { ColumnSelector } from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView';
import TextToolTip from 'components/TextToolTip';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { RuleCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

import type { AlertRule } from '../types';

import styles from './AlertRulesHeaderActions.module.scss';

const CREATE_CHECKS = [RuleCreatePermission];

interface Props {
	columns: TableColumnDef<AlertRule>[];
	onNewAlert: (e: MouseEvent) => void;
}

function AlertRulesHeaderActions({ columns, onNewAlert }: Props): JSX.Element {
	return (
		<div className={styles.actions}>
			<ColumnSelector
				columns={columns}
				storageKey="alert-rules-columns"
				testId="alert-columns-button"
			/>
			<AuthZButton
				checks={CREATE_CHECKS}
				variant="solid"
				size="sm"
				prefix={<Plus size={14} />}
				onClick={onNewAlert}
				color="primary"
				testId="list-alerts-new-alert-button"
			>
				New Alert
			</AuthZButton>
			<TextToolTip
				text="More details on how to create alerts"
				url="https://signoz.io/docs/alerts/?utm_source=product&utm_medium=list-alerts"
				urlText="Learn More"
			/>
		</div>
	);
}

export default AlertRulesHeaderActions;
