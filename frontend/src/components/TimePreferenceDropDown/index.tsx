import { Button, Dropdown, Menu, Typography } from 'antd';
import timeItems, {
	timePreferance,
	timePreferenceType,
} from 'container/NewWidget/RightContainer/timeItems';
import React, { useCallback } from 'react';

import { TextContainer } from './styles';

const TimePreference = ({
	setSelectedTime,
	selectedTime,
}: TimePreferenceDropDownProps): JSX.Element => {
	const timeMenuItemOnChangeHandler = useCallback(
		(event: TimeMenuItemOnChangeHandlerEvent) => {
			const selectedTime = timeItems.find((e) => e.enum === event.key);
			if (selectedTime !== undefined) {
				setSelectedTime(selectedTime);
			}
		},
		[setSelectedTime],
	);

	return (
		<TextContainer noButtonMargin>
			<Dropdown
				overlay={
					<Menu>
						{timeItems.map((item) => (
							<Menu.Item onClick={timeMenuItemOnChangeHandler} key={item.enum}>
								<Typography>{item.name}</Typography>
							</Menu.Item>
						))}
					</Menu>
				}
			>
				<Button>{selectedTime.name}</Button>
			</Dropdown>
		</TextContainer>
	);
};

interface TimeMenuItemOnChangeHandlerEvent {
	key: timePreferenceType | string;
}

interface TimePreferenceDropDownProps {
	setSelectedTime: React.Dispatch<React.SetStateAction<timePreferance>>;
	selectedTime: timePreferance;
}

export default TimePreference;
