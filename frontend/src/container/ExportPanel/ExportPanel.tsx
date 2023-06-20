import { Button, Typography } from 'antd';
import createDashboard from 'api/dashboard/create';
import getAll from 'api/dashboard/getAll';
import axios from 'axios';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useNotifications } from 'hooks/useNotifications';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'react-query';

import { ExportPanelProps } from '.';
import {
	DashboardSelect,
	NewDashboardButton,
	SelectWrapper,
	Title,
	Wrapper,
} from './styles';
import { getSelectOptions } from './utils';

function ExportPanel({ onExport }: ExportPanelProps): JSX.Element {
	const { notifications } = useNotifications();
	const { t } = useTranslation(['dashboard']);

	const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(
		null,
	);

	const { data, isLoading, refetch } = useQuery({
		queryFn: getAll,
		queryKey: REACT_QUERY_KEY.GET_ALL_DASHBOARDS,
	});

	const {
		mutate: createNewDashboard,
		isLoading: createDashboardLoading,
	} = useMutation(createDashboard, {
		onSuccess: () => {
			refetch();
		},
		onError: (error) => {
			if (axios.isAxiosError(error)) {
				notifications.error({
					message: error.message,
				});
			}
		},
	});

	const options = useMemo(() => getSelectOptions(data?.payload || []), [data]);

	const handleExportClick = useCallback((): void => {
		const currentSelectedDashboard = data?.payload?.find(
			({ uuid }) => uuid === selectedDashboardId,
		);

		onExport(currentSelectedDashboard || null);
	}, [data, selectedDashboardId, onExport]);

	const handleSelect = useCallback(
		(selectedDashboardValue: string): void => {
			setSelectedDashboardId(selectedDashboardValue);
		},
		[setSelectedDashboardId],
	);

	const handleNewDashboard = useCallback(async () => {
		createNewDashboard({
			title: t('new_dashboard_title', {
				ns: 'dashboard',
			}),
			uploadedGrafana: false,
		});
	}, [t, createNewDashboard]);

	return (
		<Wrapper direction="vertical">
			<Title>Export Panel</Title>

			<SelectWrapper direction="horizontal">
				<DashboardSelect
					placeholder="Select Dashboard"
					options={options}
					loading={isLoading || createDashboardLoading}
					disabled={isLoading || createDashboardLoading}
					value={selectedDashboardId}
					onSelect={handleSelect}
				/>
				<Button
					type="primary"
					disabled={isLoading || !options?.length || !selectedDashboardId}
					onClick={handleExportClick}
				>
					Export
				</Button>
			</SelectWrapper>

			<Typography>
				Or create dashboard with this panel -
				<NewDashboardButton
					disabled={createDashboardLoading}
					loading={createDashboardLoading}
					type="link"
					onClick={handleNewDashboard}
				>
					New Dashboard
				</NewDashboardButton>
			</Typography>
		</Wrapper>
	);
}

export default ExportPanel;
