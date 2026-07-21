import { Check, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Typography } from '@signozhq/ui/typography';
// eslint-disable-next-line signoz/no-antd-components -- multiline TextArea + Checkbox have no @signozhq/ui equivalent yet
import { Checkbox, Input as AntdInput } from 'antd';
import cx from 'classnames';
import { textContainsVariableReference } from 'lib/dashboardVariables/variableReference';

import type {
	VariableImpactMode,
	VariableUsage,
} from '../utils/variableUsages';
import { useVariableImpactState } from './useVariableImpactState';
import styles from './VariableImpactDialog.module.scss';

const KIND_LABEL: Record<VariableUsage['kind'], string> = {
	builder: 'Query builder',
	promql: 'PromQL',
	clickhouse: 'ClickHouse',
	variable: 'Variable',
};

interface VariableImpactDialogProps {
	open: boolean;
	mode: VariableImpactMode;
	/** The variable being renamed/deleted (its current name). */
	variableName: string;
	/** The new name (rename mode only). */
	newName?: string;
	usages: VariableUsage[];
	isLoading: boolean;
	onConfirm: (resolvedUsages: VariableUsage[]) => void;
	onClose: () => void;
}

/**
 * Blocks a rename/delete of a referenced variable behind a review step: lists
 * every usage across panel queries (builder / PromQL / ClickHouse) and other
 * variables, shows the current vs resulting query, and lets the user edit each
 * result or exclude it before applying.
 */
function VariableImpactDialog({
	open,
	mode,
	variableName,
	newName,
	usages,
	isLoading,
	onConfirm,
	onClose,
}: VariableImpactDialogProps): JSX.Element {
	const { rows, setResultingText, toggleIncluded, resolvedUsages } =
		useVariableImpactState(usages, open);

	const isRename = mode === 'rename';
	const count = usages.length;
	const plural = count === 1 ? '' : 's';
	const intro = isRename
		? `$${variableName} is used in ${count} place${plural}. Review the updated queries before renaming to $${newName}.`
		: `$${variableName} is used in ${count} place${plural}. Edit or remove each usage before deleting.`;

	const footer = (
		<div className={styles.footer}>
			<Button
				variant="solid"
				color="secondary"
				onClick={onClose}
				testId="variable-impact-cancel"
			>
				<X size={12} />
				Cancel
			</Button>
			<Button
				variant="solid"
				color={isRename ? 'primary' : 'destructive'}
				loading={isLoading}
				onClick={(): void => onConfirm(resolvedUsages)}
				testId="variable-impact-confirm"
			>
				<Check size={12} />
				{isRename ? 'Rename' : 'Delete'}
			</Button>
		</div>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title={isRename ? `Rename $${variableName}` : `Delete $${variableName}`}
			width="wide"
			showCloseButton={false}
			// Lift above the settings drawer (z ~1000); overlay off (it would only half-dim).
			style={{ zIndex: 1100 }}
			showOverlay={false}
			footer={footer}
		>
			<div className={styles.body}>
				<Typography.Text className={styles.intro}>{intro}</Typography.Text>
				<div className={styles.rows}>
					{rows.map((row) => {
						const stillReferences =
							row.included &&
							textContainsVariableReference(row.resultingText, variableName);
						return (
							<div
								key={row.id}
								className={styles.row}
								data-testid={`variable-impact-row-${row.id}`}
							>
								<div className={styles.rowHeader}>
									<Checkbox
										checked={row.included}
										onChange={(): void => toggleIncluded(row.id)}
										data-testid={`variable-impact-include-${row.id}`}
									>
										<span className={styles.sourceLabel}>{row.sourceLabel}</span>
									</Checkbox>
									<span className={styles.kindTag}>{KIND_LABEL[row.kind]}</span>
								</div>
								<div className={styles.field}>
									<Typography.Text className={styles.fieldLabel}>
										Current
									</Typography.Text>
									<AntdInput.TextArea
										className={styles.textArea}
										value={row.currentText}
										disabled
										readOnly
										autoSize={{ minRows: 1, maxRows: 4 }}
									/>
								</div>
								<div className={styles.field}>
									<Typography.Text className={styles.fieldLabel}>Result</Typography.Text>
									<AntdInput.TextArea
										className={cx(styles.textArea, !row.included && styles.disabled)}
										value={row.resultingText}
										disabled={!row.included}
										autoSize={{ minRows: 1, maxRows: 4 }}
										onChange={(e): void => setResultingText(row.id, e.target.value)}
										data-testid={`variable-impact-result-${row.id}`}
									/>
									{stillReferences ? (
										<Typography.Text size={'small'} color="warning">
											Still references ${variableName}
										</Typography.Text>
									) : null}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</DialogWrapper>
	);
}

export default VariableImpactDialog;
