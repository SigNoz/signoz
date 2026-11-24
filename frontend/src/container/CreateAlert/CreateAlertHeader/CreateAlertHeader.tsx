import { useCallback, useMemo } from 'react';
import { Input } from '@signozhq/ui/input';
import classNames from 'classnames';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { buildRuleUpdatePermission } from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { useAuthZDisabled } from 'lib/authz/hooks/useAuthZDisabled/useAuthZDisabled';
import { getActiveBuilder } from 'lib/query/builderSlot';
import { useAlertRuleOptional } from 'providers/Alert';
import { Labels } from 'types/api/alerts/def';

import { useCreateAlertState } from '../context';
import LabelsInput from './LabelsInput';

import './styles.scss';

function CreateAlertHeader(): JSX.Element {
	const { alertState, setAlertState, isEditMode, ruleId } =
		useCreateAlertState();
	// Renaming a saved rule is an update; a new rule is gated on its Save.
	const renameChecks = useMemo(
		() => (isEditMode && ruleId ? [buildRuleUpdatePermission(ruleId)] : []),
		[isEditMode, ruleId],
	);
	const renameLock = useAuthZDisabled(renameChecks);
	const alertRuleContext = useAlertRuleOptional();

	const { currentQuery } = useQueryBuilder();

	const groupByLabels = useMemo(() => {
		const labels = new Array<string>();
		getActiveBuilder(currentQuery).queryData.forEach((query) => {
			query.groupBy.forEach((groupBy) => {
				labels.push(groupBy.key);
			});
		});
		return labels;
	}, [currentQuery]);

	// If the label key is a group by label, then it is not allowed to be used as a label key
	const validateLabelsKey = useCallback(
		(key: string): string | null => {
			if (groupByLabels.includes(key)) {
				return `Cannot use ${key} as a key`;
			}
			return null;
		},
		[groupByLabels],
	);

	return (
		<div
			className={classNames('alert-header', { 'edit-alert-header': isEditMode })}
		>
			{!isEditMode && (
				<div className="alert-header__tab-bar">
					<div className="alert-header__tab">New Alert Rule</div>
				</div>
			)}
			<div className="alert-header__content">
				<div className="alert-header__input title">
					<Input
						type="text"
						value={alertState.name}
						onChange={(e): void => {
							const newName = e.target.value;
							setAlertState({ type: 'SET_ALERT_NAME', payload: newName });
							if (isEditMode && alertRuleContext?.setAlertRuleName) {
								alertRuleContext.setAlertRuleName(newName);
							}
						}}
						placeholder="Enter alert rule name"
						disabled={renameLock.disabled}
						disabledTooltip={renameLock.disabledTooltip}
						testId="alert-name-input"
					/>
				</div>
				<LabelsInput
					labels={alertState.labels}
					onLabelsChange={(labels: Labels): void =>
						setAlertState({ type: 'SET_ALERT_LABELS', payload: labels })
					}
					validateLabelsKey={validateLabelsKey}
				/>
			</div>
		</div>
	);
}

export default CreateAlertHeader;
