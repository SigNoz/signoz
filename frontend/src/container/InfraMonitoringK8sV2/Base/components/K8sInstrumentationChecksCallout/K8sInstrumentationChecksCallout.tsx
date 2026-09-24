import { MouseEvent, useCallback, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { RefreshCw } from '@signozhq/icons';
import setLocalStorage from 'api/browser/localstorage/set';
import {
	invalidateGetChecks,
	useGetChecks,
} from 'api/generated/services/inframonitoring';
import { InframonitoringtypesCheckTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEntity } from '../../../constants';

import styles from './K8sInstrumentationChecksCallout.module.scss';
import { MissingEntryRow } from './MissingEntryRow';
import { PresentEntryRow } from './PresentEntryRow';
import {
	ENTITY_TO_CHECK_TYPE,
	getStorageKey,
	hasAnyEntries,
	hasMissingEntries,
	readExpandedState,
} from './utils';

export interface InstrumentationChecksCalloutProps {
	entity: InfraMonitoringEntity;
}

export function K8sInstrumentationChecksCallout({
	entity,
}: InstrumentationChecksCalloutProps): JSX.Element | null {
	const checkType = ENTITY_TO_CHECK_TYPE[entity];
	const queryClient = useQueryClient();

	const [isExpanded, setIsExpanded] = useState(() => readExpandedState(entity));

	const { data, isLoading, isFetching } = useGetChecks(
		{ type: checkType as InframonitoringtypesCheckTypeDTO },
		{ query: { enabled: !!checkType } },
	);

	const handleRecheck = useCallback(
		(e: MouseEvent): void => {
			e.preventDefault();
			e.stopPropagation();

			if (checkType) {
				void invalidateGetChecks(queryClient, { type: checkType });
			}
		},
		[queryClient, checkType],
	);

	const handleExpandToggle = useCallback((): void => {
		setIsExpanded((prev) => {
			const next = !prev;
			setLocalStorage(getStorageKey(entity), String(next));
			return next;
		});
	}, [entity]);

	const checksData = data?.data;

	const hasMissingItems = useMemo(
		() => (checksData ? hasMissingEntries(checksData) : false),
		[checksData],
	);

	if (!checkType || isLoading) {
		return null;
	}

	if (!checksData || checksData.ready) {
		return null;
	}

	if (!hasAnyEntries(checksData)) {
		return null;
	}

	return (
		<div className={styles.checkContainer}>
			<Callout
				type={hasMissingItems ? 'warning' : 'info'}
				showIcon
				size="medium"
				title={
					<div className={styles.header}>
						Instrumentation checks
						<Button
							variant="outlined"
							color="warning"
							size="sm"
							onClick={handleRecheck}
							loading={isFetching}
							prefix={<RefreshCw size={12} />}
							data-testid="instrumentation-checks-recheck-btn"
						>
							Recheck
						</Button>
					</div>
				}
				action="expandable"
				defaultExpanded={isExpanded}
				onClick={handleExpandToggle}
			>
				<div className={styles.container} onClick={(e) => e.stopPropagation()}>
					<div className={styles.entriesList}>
						{checksData.presentDefaultEnabledMetrics?.map((entry) => (
							<PresentEntryRow
								key={`present-default-${entry.associatedComponent.name}`}
								entry={entry}
								typeLabel="Default enabled metrics"
								itemType="metrics"
							/>
						))}
						{checksData.presentOptionalMetrics?.map((entry) => (
							<PresentEntryRow
								key={`present-optional-${entry.associatedComponent.name}`}
								entry={entry}
								typeLabel="Optional metrics"
								itemType="metrics"
							/>
						))}
						{checksData.presentRequiredAttributes?.map((entry) => (
							<PresentEntryRow
								key={`present-attrs-${entry.associatedComponent.name}`}
								entry={entry}
								typeLabel="Required attributes"
								itemType="attributes"
							/>
						))}
						{checksData.missingDefaultEnabledMetrics?.map((entry) => (
							<MissingEntryRow
								key={`missing-default-${entry.associatedComponent.name}`}
								entry={entry}
								typeLabel="Missing default metrics"
								itemType="metrics"
							/>
						))}
						{checksData.missingOptionalMetrics?.map((entry) => (
							<MissingEntryRow
								key={`missing-optional-${entry.associatedComponent.name}`}
								entry={entry}
								typeLabel="Missing optional metrics"
								itemType="metrics"
							/>
						))}
						{checksData.missingRequiredAttributes?.map((entry) => (
							<MissingEntryRow
								key={`missing-attrs-${entry.associatedComponent.name}`}
								entry={entry}
								typeLabel="Missing required attributes"
								itemType="attributes"
							/>
						))}
					</div>
				</div>
			</Callout>
		</div>
	);
}
