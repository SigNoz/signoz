import { PlusOutlined } from '@ant-design/icons';
import { Dropdown, MenuProps, Row, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';
import { NewDashboardState } from 'container/ListOfDashboard';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ButtonContainer, NewDashboardButton } from '../../styles';
import { getDashBoardText, getMenuItems } from './helpers';

function DashBoardListHeader({
	isDashboardListLoading,
	newDashboard,
	newDashboardState,
	createNewDashboard,
	onModalHandler,
	onNewDashboardHandler,
}: Props): JSX.Element {
	const { t } = useTranslation('dashboard');

	const menu: MenuProps = useMemo(
		() => ({
			items: getMenuItems({
				createNewDashboard,
				isDashboardListLoading,
				onModalHandler,
				onNewDashboardHandler,
				t,
			}),
		}),
		[
			createNewDashboard,
			isDashboardListLoading,
			onModalHandler,
			onNewDashboardHandler,
			t,
		],
	);

	return (
		<Row justify="space-between">
			<Typography>Dashboard List</Typography>

			<ButtonContainer>
				<TextToolTip
					text="More details on how to create dashboards"
					url="https:signoz.io/docs/userguide/dashboards"
				/>
				{newDashboard && (
					<Dropdown
						disabled={isDashboardListLoading}
						trigger={['click']}
						menu={menu}
					>
						<NewDashboardButton
							icon={<PlusOutlined />}
							type="primary"
							loading={newDashboardState.loading}
							danger={newDashboardState.error}
						>
							{getDashBoardText(newDashboardState)}
						</NewDashboardButton>
					</Dropdown>
				)}
			</ButtonContainer>
		</Row>
	);
}

interface Props {
	newDashboard: boolean;
	isDashboardListLoading: boolean;
	newDashboardState: NewDashboardState;
	createNewDashboard: boolean;
	onNewDashboardHandler: () => Promise<void>;
	onModalHandler: (uploadedGrafana: boolean) => void;
}

export default DashBoardListHeader;
