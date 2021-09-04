import {
	Button,
	Dropdown,
	Input,
	Menu,
	Slider,
	Switch,
	Typography,
} from 'antd';
import InputComponent from 'components/Input';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import GraphTypes from 'container/NewDashboard/ComponentsSlider/menuItems';
import React, { useCallback } from 'react';

import timeItems, { timePreferance, timePreferenceType } from './timeItems';

const { TextArea } = Input;
import { Container, NullButtonContainer, TextContainer, Title } from './styles';

const RightContainer = ({
	description,
	opacity,
	selectedNullZeroValue,
	setDescription,
	setOpacity,
	setSelectedNullZeroValue,
	setStacked,
	setTitle,
	stacked,
	title,
	selectedGraph,
	setSelectedTime,
	selectedTime,
}: RightContainerProps): JSX.Element => {
	const onChangeHandler = useCallback(
		(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const nullValueButtons = [
		{
			check: 'zero',
			name: 'Zero',
		},
		{
			check: 'interpolate',
			name: 'Interpolate',
		},
		{
			check: 'blank',
			name: 'Blank',
		},
	];

	const timeMenuItemOnChangeHandler = useCallback(
		(event: TimeMenuItemOnChangeHandlerEvent) => {
			const selectedTime = timeItems.find((e) => e.enum === event.key);
			if (selectedTime !== undefined) {
				setSelectedTime(selectedTime);
			}
		},
		[],
	);

	const selectedGraphType =
		GraphTypes.find((e) => e.name === selectedGraph)?.display || '';

	return (
		<Container>
			<InputComponent
				labelOnTop
				label="Panel Type"
				size="middle"
				value={selectedGraphType}
				disabled
			/>

			<Title>Panel Attributes</Title>

			<InputComponent
				label="Panel Title"
				size="middle"
				placeholder="Title"
				labelOnTop
				onChangeHandler={(event): void =>
					onChangeHandler(setTitle, event.target.value)
				}
				value={title}
			/>

			<Title light={'true'}>Description</Title>

			<TextArea
				placeholder="Write something describing the  panel"
				bordered
				allowClear
				value={description}
				onChange={(event): void =>
					onChangeHandler(setDescription, event.target.value)
				}
			/>

			<TextContainer>
				<Typography>Stacked Graphs :</Typography>
				<Switch
					checked={stacked}
					onChange={(): void => {
						setStacked((value) => !value);
					}}
				/>
			</TextContainer>

			<Title light={'true'}>Fill Opacity: </Title>

			<Slider
				value={parseInt(opacity, 10)}
				marks={{
					0: '0',
					33: '33',
					66: '66',
					100: '100',
				}}
				onChange={(number): void => onChangeHandler(setOpacity, number.toString())}
				step={1}
			/>

			<Title light={'true'}>Null/Zero values: </Title>

			<NullButtonContainer>
				{nullValueButtons.map((button) => (
					<Button
						type={button.check === selectedNullZeroValue ? 'primary' : 'default'}
						key={button.name}
						onClick={(): void =>
							onChangeHandler(setSelectedNullZeroValue, button.check)
						}
					>
						{button.name}
					</Button>
				))}
			</NullButtonContainer>

			<Title light={'true'}>Panel Time Preference</Title>

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
		</Container>
	);
};

interface RightContainerProps {
	title: string;
	setTitle: React.Dispatch<React.SetStateAction<string>>;
	description: string;
	setDescription: React.Dispatch<React.SetStateAction<string>>;
	stacked: boolean;
	setStacked: React.Dispatch<React.SetStateAction<boolean>>;
	opacity: string;
	setOpacity: React.Dispatch<React.SetStateAction<string>>;
	selectedNullZeroValue: string;
	setSelectedNullZeroValue: React.Dispatch<React.SetStateAction<string>>;
	selectedGraph: GRAPH_TYPES;
	setSelectedTime: React.Dispatch<React.SetStateAction<timePreferance>>;
	selectedTime: timePreferance;
}
interface TimeMenuItemOnChangeHandlerEvent {
	key: timePreferenceType | string;
}

export default RightContainer;
