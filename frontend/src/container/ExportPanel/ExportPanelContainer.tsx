import { Button, Typography } from 'antd';
import createDashboard from 'api/v1/dashboards/create';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import APIError from 'types/api/error';

import { ExportPanelProps } from '.';
import {
	DashboardSelect,
	NewDashboardButton,
	SelectWrapper,
	Title,
	Wrapper,
} from './styles';
import { filterOptions, getSelectOptions } from './utils';

function ExportPanelContainer({
	isLoading,
	onExport,
}: ExportPanelProps): JSX.Element {
	const { t } = useTranslation(['dashboard']);

	const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(
		null,
	);

	const {
		data,
		isLoading: isAllDashboardsLoading,
		refetch,
	} = useGetAllDashboard();

	const { showErrorModal } = useErrorModal();

	const {
		mutate: createNewDashboard,
		isLoading: createDashboardLoading,
	} = useMutation(createDashboard, {
		onSuccess: (data) => {
			if (data.data) {
				onExport(data?.data, true);
			}
			refetch();
		},
		onError: (error) => {
			showErrorModal(error as APIError);
		},
	});

	const options = useMemo(() => getSelectOptions(data?.data || []), [data]);

	const handleExportClick = useCallback((): void => {
		const currentSelectedDashboard = data?.data?.find(
			({ id }) => id === selectedDashboardId,
		);

		onExport(currentSelectedDashboard || null, false);
	}, [data, selectedDashboardId, onExport]);

	const handleSelect = useCallback(
		(selectedDashboardValue: string): void => {
			setSelectedDashboardId(selectedDashboardValue);
		},
		[setSelectedDashboardId],
	);

	const handleNewDashboard = useCallback(async () => {
		try {
			await createNewDashboard({
				title: t('new_dashboard_title', {
					ns: 'dashboard',
				}),
				uploadedGrafana: false,
				version: ENTITY_VERSION_V5,
			});
		} catch (error) {
			showErrorModal(error as APIError);
		}
	}, [createNewDashboard, t, showErrorModal]);

	const isDashboardLoading = isAllDashboardsLoading || createDashboardLoading;

	const isDisabled =
		isAllDashboardsLoading ||
		!options?.length ||
		!selectedDashboardId ||
		isLoading;

	return (
		<Wrapper direction="vertical">
			<Title>Export Panel</Title>

			<SelectWrapper direction="horizontal">
				<DashboardSelect
					placeholder="Select Dashboard"
					options={options}
					showSearch
					loading={isDashboardLoading}
					disabled={isDashboardLoading}
					value={selectedDashboardId}
					onSelect={handleSelect}
					filterOption={filterOptions}
				/>
				<Button
					type="primary"
					loading={isLoading}
					disabled={isDisabled}
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

export default ExportPanelContainer;
