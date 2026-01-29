import { useCallback, useMemo } from 'react';
import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import classNames from 'classnames';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { RotateCcw } from 'lucide-react';
import { Labels } from 'types/api/alerts/def';

import { useCreateAlertState } from '../context';
import LabelsInput from './LabelsInput';

import './styles.scss';

function CreateAlertHeader(): JSX.Element {
	const { alertState, setAlertState, isEditMode } = useCreateAlertState();

	const { currentQuery } = useQueryBuilder();
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	const groupByLabels = useMemo(() => {
		const labels = new Array<string>();
		currentQuery.builder.queryData.forEach((query) => {
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

	const handleSwitchToClassicExperience = useCallback(() => {
		logEvent('Alert: Switch to classic experience button clicked', {});

		urlQuery.set(QueryParams.showClassicCreateAlertsPage, 'true');
		const url = `${ROUTES.ALERTS_NEW}?${urlQuery.toString()}`;
		safeNavigate(url, { replace: true });
	}, [safeNavigate, urlQuery]);

	return (
		<div
			className={classNames('alert-header', { 'edit-alert-header': isEditMode })}
		>
			{!isEditMode && (
				<div className="alert-header__tab-bar">
					<div className="alert-header__tab">New Alert Rule</div>
					<Button
						icon={<RotateCcw size={16} />}
						onClick={handleSwitchToClassicExperience}
					>
						Switch to Classic Experience
					</Button>
				</div>
			)}
			<div className="alert-header__content">
				<input
					type="text"
					value={alertState.name}
					onChange={(e): void =>
						setAlertState({ type: 'SET_ALERT_NAME', payload: e.target.value })
					}
					className="alert-header__input title"
					placeholder="Enter alert rule name"
					data-testid="alert-name-input"
				/>
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
