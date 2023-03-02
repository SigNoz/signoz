import { Button, Dropdown, Menu, Typography } from 'antd';
import TimeItems, {
	timePreferance,
	timePreferenceType,
} from 'container/NewWidget/RightContainer/timeItems';
import React, { useCallback } from 'react';

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

	const items = TimeItems.map((item) => ({
		key: item.enum,
		label: <Typography>{item.name}</Typography>,
	}));

	return (
		<TextContainer noButtonMargin>
			<Dropdown
				overlay={<Menu onClick={timeMenuItemOnChangeHandler} items={items} />}
			>
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
