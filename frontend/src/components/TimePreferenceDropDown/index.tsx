import { Button, Dropdown } from 'antd';
import TimeItems, {
	timePreferance,
	timePreferenceType,
} from 'container/NewWidget/RightContainer/timeItems';
import React, { useCallback, useMemo } from 'react';

import { menuItems } from './config';
import { TextContainer } from './styles';

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
		<TextContainer noButtonMargin>
			<Dropdown menu={menu}>
				<Button>{selectedTime.name}</Button>
			</Dropdown>
		</TextContainer>
	);
}

interface TimeMenuItemOnChangeHandlerEvent {
	key: timePreferenceType | string;
}

interface TimePreferenceDropDownProps {
	setSelectedTime: React.Dispatch<React.SetStateAction<timePreferance>>;
	selectedTime: timePreferance;
}

export default TimePreference;
