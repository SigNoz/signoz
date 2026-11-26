// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Alert } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useQuery } from 'react-query';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import dayjs from 'dayjs';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { noop } from 'lodash-es';
import DashboardContainer from 'pages/DashboardPage/DashboardContainer';
import {
	CHARTS_ONLY,
	withControls,
} from 'pages/DashboardPage/DashboardContainer/controls/presets';
import type { DashboardQuerySource } from 'pages/DashboardPage/DashboardContainer/store/slices/editContextSlice';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { COST_METER_DASHBOARD } from './dashboard';

import './BreakDown.styles.scss';

// Built in the frontend, never fetched: the container reads it back from this cache entry.
const QUERY_KEY = ['cost-meter-breakdown-dashboard'];
const select = (
	dashboard: DashboardtypesGettableDashboardV2DTO,
): DashboardtypesGettableDashboardV2DTO => dashboard;
const SOURCE: DashboardQuerySource = { queryKey: QUERY_KEY, select };

const CONTROLS = withControls(CHARTS_ONLY, {
	toolbar: { autoRefresh: false },
});

function BreakDown(): JSX.Element {
	const { isCloudUser } = useGetTenantLicense();
	useQuery(QUERY_KEY, () => COST_METER_DASHBOARD, {
		initialData: COST_METER_DASHBOARD,
		staleTime: Infinity,
	});
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
						data-testid="cost-meter-utc-notice"
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
			<DashboardContainer
				dashboard={COST_METER_DASHBOARD}
				refetch={noop}
				source={SOURCE}
				readOnly
				controls={CONTROLS}
			/>
		</div>
	);
}

export default BreakDown;
