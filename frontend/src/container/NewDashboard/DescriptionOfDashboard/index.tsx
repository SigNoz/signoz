import './Description.styles.scss';

import { ShareAltOutlined } from '@ant-design/icons';
import {
	Button,
	Card,
	Col,
	Dropdown,
	MenuProps,
	Row,
	Tag,
	Typography,
} from 'antd';
import { ItemType } from 'antd/es/menu/hooks/useItems';
import useComponentPermission from 'hooks/useComponentPermission';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DashboardData } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';

import DashboardVariableSelection from '../DashboardVariablesSelection';
import SettingsDrawer from './SettingsDrawer';
import ShareModal from './ShareModal';
import { downloadObjectAsJson } from './util';

function DescriptionOfDashboard(): JSX.Element {
	const { selectedDashboard } = useDashboard();

	const selectedData: DashboardData = selectedDashboard?.data;
	const { title = '', tags, description } = selectedData || {};

	const [openDashboardJSON, setOpenDashboardJSON] = useState<boolean>(false);

	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [editDashboard] = useComponentPermission(['edit_dashboard'], role);

	const onToggleHandler = (): void => {
		setOpenDashboardJSON((state) => !state);
	};

	const items: MenuProps['items'] = [
		{
			label: 'View JSON',
			key: 'viewJson',
		},
		{
			label: 'Download JSON',
			key: 'downloadJSON',
		},
	];

	const handleMenuClick = (action: ItemType): void => {
		console.log('action', action?.key);

		if (action?.key === 'downloadJSON') {
			console.log('selectedData', selectedData);
			downloadObjectAsJson(selectedData, selectedData?.title);
		} else {
			setOpenDashboardJSON(true);
		}
	};
	return (
		<Card>
			<Row gutter={16}>
				<Col flex={1} span={12}>
					<Typography.Title level={4} style={{ padding: 0, margin: 0 }}>
						{title}
					</Typography.Title>
					{description && (
						<Typography className="dashboard-description">{description}</Typography>
					)}

					{tags && (
						<div style={{ margin: '0.5rem 0' }}>
							{tags?.map((tag) => (
								<Tag key={tag}>{tag}</Tag>
							))}
						</div>
					)}
				</Col>
				<Col span={8}>
					<Row justify="end">
						<DashboardVariableSelection />
					</Row>
				</Col>
				<Col span={4} style={{ textAlign: 'right' }}>
					{selectedData && (
						<ShareModal
							isJSONModalVisible={openDashboardJSON}
							onToggleHandler={onToggleHandler}
							selectedData={selectedData}
						/>
					)}

					{editDashboard && <SettingsDrawer drawerTitle={title} />}

					<Dropdown
						menu={{
							items,
							onClick: handleMenuClick,
						}}
					>
						<Button type="dashed" icon={<ShareAltOutlined />} />
						{/* <ShareAltOutlined /> */}
					</Dropdown>
				</Col>
			</Row>
		</Card>
	);
}

export default DescriptionOfDashboard;
