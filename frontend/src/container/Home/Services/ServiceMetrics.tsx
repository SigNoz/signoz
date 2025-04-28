import { Button, Select, Skeleton, Table } from 'antd';
import logEvent from 'api/common/logEvent';
import { ENTITY_VERSION_V4 } from 'constants/app';
import ROUTES from 'constants/routes';
import {
	getQueryRangeRequestData,
	getServiceListFromQuery,
} from 'container/ServiceApplication/utils';
import { useGetQueriesRange } from 'hooks/queryBuilder/useGetQueriesRange';
import useGetTopLevelOperations from 'hooks/useGetTopLevelOperations';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import history from 'lib/history';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { IUser } from 'providers/App/types';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryKey } from 'react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppState } from 'store/reducers';
import {
	LicensePlatform,
	LicenseV3ResModel,
} from 'types/api/licensesV3/getActive';
import { ServicesList } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';
import { USER_ROLES } from 'types/roles';

import { DOCS_LINKS } from '../constants';
import { columns, TIME_PICKER_OPTIONS } from './constants';

const homeInterval = 30 * 60 * 1000;

// Extracted EmptyState component
const EmptyState = memo(
	({
		user,
		activeLicenseV3,
	}: {
		user: IUser;
		activeLicenseV3: LicenseV3ResModel | null;
	}): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img
						src="/Icons/triangle-ruler.svg"
						alt="empty-alert-icon"
						className="empty-state-icon"
					/>
					<div className="empty-title">You are not sending traces yet.</div>
					<div className="empty-description">
						Start sending traces to see your services.
					</div>
				</div>

				{user?.role !== USER_ROLES.VIEWER && (
					<div className="empty-actions-container">
						<Button
							type="default"
							className="periscope-btn secondary"
							onClick={(): void => {
								logEvent('Homepage: Get Started clicked', {
									source: 'Service Metrics',
								});

								if (
									activeLicenseV3 &&
									activeLicenseV3.platform === LicensePlatform.CLOUD
								) {
									history.push(ROUTES.GET_STARTED_WITH_CLOUD);
								} else {
									window?.open(
										DOCS_LINKS.ADD_DATA_SOURCE,
										'_blank',
										'noopener noreferrer',
									);
								}
							}}
						>
							Get Started &nbsp; <ArrowRight size={16} />
						</Button>

						<Button
							type="link"
							className="learn-more-link"
							onClick={(): void => {
								logEvent('Homepage: Learn more clicked', {
									source: 'Service Metrics',
								});
								window.open(
									'https://signoz.io/docs/instrumentation/overview/',
									'_blank',
								);
							}}
						>
							Learn more <ArrowUpRight size={12} />
						</Button>
					</div>
				)}
			</div>
		</div>
	),
);
EmptyState.displayName = 'EmptyState';

// Extracted ServicesList component
const ServicesListTable = memo(
	({
		services,
		onRowClick,
	}: {
		services: ServicesList[];
		onRowClick: (record: ServicesList) => void;
	}): JSX.Element => (
		<div className="services-list-container home-data-item-container metrics-services-list">
			<div className="services-list">
				<Table<ServicesList>
					columns={columns}
					dataSource={services}
					pagination={false}
					className="services-table"
					onRow={(record): { onClick: () => void } => ({
						onClick: (): void => onRowClick(record),
					})}
				/>
			</div>
		</div>
	),
);
ServicesListTable.displayName = 'ServicesListTable';
