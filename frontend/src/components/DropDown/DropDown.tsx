import './DropDown.styles.scss';

import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps } from 'antd';
import logEvent from 'api/common/logEvent';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useState } from 'react';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { GettableAlert } from 'types/api/alerts/get';

function DropDown({
	element,
	record,
}: {
	element: JSX.Element[];
	record: GettableAlert;
}): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const items: MenuProps['items'] = element.map(
		(e: JSX.Element, index: number) => ({
			label: e,
			key: index,
		}),
	);

	const [isDdOpen, setDdOpen] = useState<boolean>(false);

	const alertActionLogEvent = (action: string): void => {
		let actionValue = '';
		switch (action) {
			case '0':
				actionValue = 'Enable/Disable';
				break;
			case '1':
				actionValue = 'Edit';
				break;
			case '2':
				actionValue = 'Clone';
				break;
			case '3':
				actionValue = 'Delete';
				break;
			default:
				break;
		}
		logEvent('Alert: Action', {
			ruleId: record.id,
			dataSource: ALERTS_DATA_SOURCE_MAP[record.alertType as AlertTypes],
			name: record.alert,
			action: actionValue,
		});
	};

	return (
		<Dropdown
			menu={{
				items,
				onMouseEnter: (): void => setDdOpen(true),
				onMouseLeave: (): void => setDdOpen(false),
				onClick: (item): void => alertActionLogEvent(item.key),
			}}
			open={isDdOpen}
		>
			<Button
				type="link"
				className={!isDarkMode ? 'dropdown-button--dark' : 'dropdown-button'}
				onClick={(e): void => {
					e.preventDefault();
					setDdOpen(true);
				}}
			>
				<EllipsisOutlined className="dropdown-icon" />
			</Button>
		</Dropdown>
	);
}

export default DropDown;
