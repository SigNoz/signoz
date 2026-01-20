import { Color } from '@signozhq/design-tokens';
import { Button, Switch, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import { Check, Info, Link2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { matchPath, useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

const routesToBeSharedWithTime = [
	ROUTES.LOGS_EXPLORER,
	ROUTES.TRACES_EXPLORER,
	ROUTES.METRICS_EXPLORER_EXPLORER,
	ROUTES.METER_EXPLORER,
];

function ShareURLModal(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [enableAbsoluteTime, setEnableAbsoluteTime] = useState(
		selectedTime !== 'custom',
	);

	const startTime = urlQuery.get(QueryParams.startTime);
	const endTime = urlQuery.get(QueryParams.endTime);
	const relativeTime = urlQuery.get(QueryParams.relativeTime);

	const [isURLCopied, setIsURLCopied] = useState(false);
	const [, handleCopyToClipboard] = useCopyToClipboard();

	const isValidateRelativeTime = useMemo(
		() =>
			selectedTime !== 'custom' ||
			(startTime && endTime && selectedTime === 'custom'),
		[startTime, endTime, selectedTime],
	);

	const shareURLWithTime = useMemo(
		() => relativeTime || (startTime && endTime),
		[relativeTime, startTime, endTime],
	);

	const isRouteToBeSharedWithTime = useMemo(
		() =>
			routesToBeSharedWithTime.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const processURL = (): string => {
		let currentUrl = window.location.href;
		const isCustomTime = !!(startTime && endTime && selectedTime === 'custom');

		if (shareURLWithTime || isRouteToBeSharedWithTime) {
			if (enableAbsoluteTime || isCustomTime) {
				if (selectedTime === 'custom') {
					if (startTime && endTime) {
						urlQuery.set(QueryParams.startTime, startTime.toString());
						urlQuery.set(QueryParams.endTime, endTime.toString());
					}
				} else {
					const { minTime, maxTime } = GetMinMax(selectedTime);

					urlQuery.set(QueryParams.startTime, minTime.toString());
					urlQuery.set(QueryParams.endTime, maxTime.toString());
				}

				urlQuery.delete(QueryParams.relativeTime);

				currentUrl = `${window.location.origin}${
					location.pathname
				}?${urlQuery.toString()}`;
			} else {
				urlQuery.delete(QueryParams.startTime);
				urlQuery.delete(QueryParams.endTime);

				urlQuery.set(QueryParams.relativeTime, selectedTime);
				currentUrl = `${window.location.origin}${
					location.pathname
				}?${urlQuery.toString()}`;
			}
		}

		return currentUrl;
	};

	const handleCopyURL = (): void => {
		const URL = processURL();

		handleCopyToClipboard(URL);
		setIsURLCopied(true);

		logEvent('Share: Copy link clicked', {
			page: location.pathname,
			URL,
		});

		setTimeout(() => {
			setIsURLCopied(false);
		}, 1000);
	};

	return (
		<div className="share-modal-content">
			{(shareURLWithTime || isRouteToBeSharedWithTime) && (
				<>
					<div className="absolute-relative-time-toggler-container">
						<Typography.Text className="absolute-relative-time-toggler-label">
							Enable absolute time
						</Typography.Text>

						<div className="absolute-relative-time-toggler">
							{!isValidateRelativeTime && (
								<Info size={14} color={Color.BG_AMBER_600} />
							)}
							<Switch
								checked={enableAbsoluteTime}
								disabled={!isValidateRelativeTime}
								size="small"
								onChange={(): void => {
									setEnableAbsoluteTime((prev) => !prev);
								}}
							/>
						</div>
					</div>

					{!isValidateRelativeTime && (
						<div className="absolute-relative-time-error">
							Please select / enter valid relative time to toggle.
						</div>
					)}
				</>
			)}

			<div className="share-link">
				<div className="url-share-container">
					<div className="url-share-container-header">
						<Typography.Text className="url-share-title">
							Share page link
						</Typography.Text>
						<Typography.Text className="url-share-sub-title">
							Share the current page link with your team member
						</Typography.Text>
					</div>

					<Button
						className="periscope-btn secondary"
						onClick={handleCopyURL}
						icon={isURLCopied ? <Check size={14} /> : <Link2 size={14} />}
					>
						Copy page link
					</Button>
				</div>
			</div>
		</div>
	);
}

export default ShareURLModal;
