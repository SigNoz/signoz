import { Button, Popover, Typography } from 'antd';
import createDashboard from 'api/dashboard/create';
import getAll from 'api/dashboard/getAll';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'react-query';
import { generatePath, useHistory } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';

import { overlayInnerStyle, overlayStyles } from './config';
import {
	DashboardSelect,
	NewDashboardButton,
	SelectWrapper,
	Title,
	Wrapper,
} from './styles';
import { getSelectOptions } from './utils';

interface ExportPanelProps {
	onExport: (dashboard: Dashboard | null) => void;
}

function ExportPanel({ onExport }: ExportPanelProps): JSX.Element {
	const { t } = useTranslation('dashboard');
	const history = useHistory();

	const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(
		null,
	);

	const { data, isLoading } = useQuery({
		queryFn: getAll,
		queryKey: REACT_QUERY_KEY.GET_ALL_DASHBOARDS,
	});

	const { mutate: createNewDashboard } = useMutation(createDashboard, {
		onSuccess: (response) => {
			history.push(
				generatePath(ROUTES.DASHBOARD, {
					dashboardId: response?.payload?.uuid,
				}),
			);
		},
		onError: (error) => console.error(error),
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

	const ExportPanelContent = useMemo(
		() => (
			<Wrapper direction="vertical">
				<Title>Export Panel</Title>

				<SelectWrapper direction="horizontal">
					<DashboardSelect
						placeholder="Select Dashboard"
						options={options}
						loading={isLoading}
						disabled={isLoading}
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
					<NewDashboardButton type="link" onClick={handleNewDashboard}>
						New Dashboard
					</NewDashboardButton>
				</Typography>
			</Wrapper>
		),
		[
			options,
			isLoading,
			selectedDashboardId,
			handleSelect,
			handleExportClick,
			handleNewDashboard,
		],
	);

	return (
		<Popover
			placement="bottom"
			trigger="click"
			content={ExportPanelContent}
			overlayStyle={overlayStyles}
			overlayInnerStyle={overlayInnerStyle}
		>
			<Button>Actions</Button>
		</Popover>
	);
}

export default ExportPanel;
