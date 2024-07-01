import './TimePreference.styles.scss';

import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Typography } from 'antd';
import TimeItems, {
	timePreferance,
	timePreferenceType,
} from 'container/NewWidget/RightContainer/timeItems';
import { Globe } from 'lucide-react';
import { Dispatch, SetStateAction, useCallback, useMemo } from 'react';

import { menuItems } from './config';

function TimePreference({
	setSelectedTime,
	selectedTime,
}: TimePreferenceDropDownProps): JSX.Element {
	const timeMenuItemOnChangeHandler = useCallback(
		(event: TimeMenuItemOnChangeHandlerEvent) => {
			const selectedTime = TimeItems.find((e) => e.enum === event.key);
			if (selectedTime !== undefined) {
				setSelectedTime(selectedTime);
			}
		},
		[setSelectedTime],
	);

	const menu = useMemo(
		() => ({
			items: menuItems,
			onClick: timeMenuItemOnChangeHandler,
		}),
		[timeMenuItemOnChangeHandler],
	);

	return (
		<Dropdown
			menu={menu}
			rootClassName="time-selection-menu"
			className="time-selection-target"
			trigger={['click']}
		>
			<Button>
				<div className="button-selected-text">
					<Globe size={14} />
					<Typography.Text className="selected-value">
						{selectedTime.name}
					</Typography.Text>
				</div>
				<DownOutlined />
			</Button>
		</Dropdown>
	);
}

interface TimeMenuItemOnChangeHandlerEvent {
	key: timePreferenceType | string;
}

interface TimePreferenceDropDownProps {
	setSelectedTime: Dispatch<SetStateAction<timePreferance>>;
	selectedTime: timePreferance;
}

export default TimePreference;
