import { ReactNode } from 'react';
import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import { DataViewer } from 'periscope/components/DataViewer';
import { ILog } from 'types/api/logs/log';

import { useLogAttributeActions } from './hooks/useLogAttributeActions';
import {
	aggregateAttributesResourcesToObject,
	buildPrettyViewData,
	getSanitizedLogBody,
} from './utils';

import './Overview.styles.scss';

// Skip body sanitization above this size. sanitization is expensive and fails
// for large bodies
const MAX_BODY_SANITIZE_CHARS = 64 * 1024;

interface OverviewProps {
	logData: ILog;
	isListViewPanel?: boolean;
	handleChangeSelectedView?: ChangeViewFunctionType;
	onApplyLogFilter?: (expression: string) => void;
}

function Overview({
	logData,
	isListViewPanel = false,
	handleChangeSelectedView,
	onApplyLogFilter,
}: OverviewProps): JSX.Element {
	const { actions, visibleActions } = useLogAttributeActions({
		handleChangeSelectedView,
		isListViewPanel,
		onApplyLogFilter,
	});

	const raw = aggregateAttributesResourcesToObject(logData);
	const prettyData = buildPrettyViewData(raw);

	return (
		<div className="overview-container">
			<DataViewer
				data={prettyData}
				drawerKey="logs-details"
				fontSize={13}
				prettyViewProps={{
					actions,
					visibleActions,
					renderLeafValue: (value, keyPath): ReactNode | undefined => {
						// Sanitize (unescape + ANSI→color) string values under `body`.
						// Skip huge ones (render raw, still safe) to avoid the sanitize
						// choke;
						if (
							typeof value !== 'string' ||
							keyPath[keyPath.length - 1] !== 'body' ||
							value.length > MAX_BODY_SANITIZE_CHARS
						) {
							return undefined;
						}
						return (
							<span
								className="log-body-value"
								// Safe: getSanitizedLogBody runs the value through dompurify.
								// eslint-disable-next-line react/no-danger
								dangerouslySetInnerHTML={{
									__html: getSanitizedLogBody(value, { shouldEscapeHtml: true }),
								}}
							/>
						);
					},
				}}
				jsonString={JSON.stringify(raw, null, 2)}
			/>
		</div>
	);
}

Overview.defaultProps = {
	isListViewPanel: false,
	handleChangeSelectedView: undefined,
};

export default Overview;
