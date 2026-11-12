// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Alert } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import SystemDashboard from 'container/SystemDashboard/SystemDashboard';
import { createSystemDashboardHost } from 'container/SystemDashboard/systemDashboardHost';
import dayjs from 'dayjs';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import {
	CHARTS_ONLY,
	withControls,
} from 'pages/DashboardPage/DashboardContainer/controls/presets';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import './BreakDown.styles.scss';

const COST_METER = createSystemDashboardHost(
	'cost-meter-breakdown',
	'cost-meter-breakdown',
);

const CONTROLS = withControls(CHARTS_ONLY, {
	toolbar: { autoRefresh: false },
});

function BreakDown(): JSX.Element {
	const { isCloudUser } = useGetTenantLicense();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const showInfo =
		getLocalStorageApi(LOCALSTORAGE.DISSMISSED_COST_METER_INFO) !== 'true';
	const isDateBeforeAugust22nd2025 = (minTime: number): boolean => {
		const august22nd2025UTC = dayjs.utc('2025-08-22T00:00:00Z');
		return dayjs(minTime / 1e6).isBefore(august22nd2025UTC);
	};
	const showShortRangeWarning = (maxTime - minTime) / 1e6 < 61 * 60 * 1000;

	return (
		<div className="meter-explorer-breakdown">
			<section className="meter-explorer-notices">
				{showInfo && (
					<Alert
						type="info"
						showIcon
						closable
						onClose={(): void => {
							setLocalStorageApi(LOCALSTORAGE.DISSMISSED_COST_METER_INFO, 'true');
						}}
						message="Billing is calculated in UTC. To match your meter data with billing, select full-day ranges in UTC time (00:00 – 23:59 UTC). 
						For example, if you’re in PT, for the billing of Jan 1, select your time range as Dec 31, 4:00 PM – Jan 1, 3:59 PM PT."
					/>
				)}
				{isCloudUser && isDateBeforeAugust22nd2025(minTime) && (
					<Alert
						type="warning"
						showIcon
						message="Meter module data is accurate only from 22nd August 2025, 00:00 UTC onwards. Data before this time was collected during the beta phase and may be inaccurate."
					/>
				)}

				{showShortRangeWarning && (
					<Alert
						type="warning"
						showIcon
						closable
						message={
							<>
								Meter metrics data is aggregated over 1 hour period. Please select time
								range accordingly.&nbsp;
								<a
									href="https://signoz.io/docs/cost-meter/overview/#get-started"
									rel="noopener noreferrer"
									target="_blank"
									style={{ textDecoration: 'underline' }}
								>
									Learn more
								</a>
								.
							</>
						}
					/>
				)}
			</section>
			<SystemDashboard host={COST_METER} controls={CONTROLS} />
		</div>
	);
}

export default BreakDown;
