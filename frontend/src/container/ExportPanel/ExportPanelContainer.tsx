import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import createDashboard from 'api/dashboard/create';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import useAxiosError from 'hooks/useAxiosError';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';

import { ExportPanelProps } from '.';
import {
	ButtonWrapper,
	DashboardSelect,
	DiscardButton,
	ExportButton,
	IconWrapper,
	NewDashboardButton,
	SelectWrapper,
	Title,
	Wrapper,
} from './styles';
import { filterOptions, getSelectOptions } from './utils';

function ExportPanelContainer({
	isLoading,
	onExport,
	onDiscard,
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

	const handleError = useAxiosError();

	const {
		mutate: createNewDashboard,
		isLoading: createDashboardLoading,
	} = useMutation(createDashboard, {
		onSuccess: (data) => {
			if (data.payload) {
				onExport(data?.payload, true);
			}
			refetch();
		},
		onError: handleError,
	});

	const options = useMemo(() => getSelectOptions(data || []), [data]);

	const handleExportClick = useCallback((): void => {
		const currentSelectedDashboard = data?.find(
			({ uuid }) => uuid === selectedDashboardId,
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
		createNewDashboard({
			title: t('new_dashboard_title', {
				ns: 'dashboard',
			}),
			uploadedGrafana: false,
			version: ENTITY_VERSION_V4,
		});
	}, [t, createNewDashboard]);

	const isDashboardLoading = isAllDashboardsLoading || createDashboardLoading;

	const isDisabled =
		isAllDashboardsLoading ||
		!options?.length ||
		!selectedDashboardId ||
		isLoading;

	return (
		<Wrapper>
			<Title>Export Panel to...</Title>

			<SelectWrapper>
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
			</SelectWrapper>

			<Typography>
				Or
				<NewDashboardButton
					disabled={createDashboardLoading}
					loading={createDashboardLoading}
					type="link"
					onClick={handleNewDashboard}
					icon={
						<IconWrapper>
							<PlusIcon size={12} />
						</IconWrapper>
					}
				>
					Create new dashboard
				</NewDashboardButton>
			</Typography>
			<ButtonWrapper>
				<DiscardButton icon={<ArrowLeftOutlined />} onClick={onDiscard}>
					Discard
				</DiscardButton>
				<ExportButton
					type="primary"
					loading={isLoading}
					disabled={isDisabled}
					onClick={handleExportClick}
					icon={<CheckOutlined />}
				>
					Export to dashboard
				</ExportButton>
			</ButtonWrapper>
		</Wrapper>
	);
}

export default ExportPanelContainer;
