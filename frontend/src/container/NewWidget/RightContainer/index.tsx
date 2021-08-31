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
import React, { useCallback, useState } from 'react';

const { TextArea } = Input;
import { Container, NullButtonContainer, TextContainer, Title } from './styles';

const RightContainer = ({
	selectedGraph,
}: RightContainerProps): JSX.Element => {
	const [title, setTitle] = useState<string>('');
	const [description, setDescription] = useState<string>('');
	const [stacked, setStacked] = useState<boolean>(false);
	const [opacity, setOpacity] = useState<string>('');
	const [selectedNullZeroValue, setSelectedNullZeroValue] = useState<string>(
		'zero',
	);

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

	return (
		<Container>
			<InputComponent
				labelOnTop
				label="Panel Type"
				size="middle"
				value={selectedGraph}
			/>

			<Title>Panel Attributes</Title>

			<InputComponent
				label="Panel Type"
				size="middle"
				placeholder="Title"
				labelOnTop
				onChangeHandler={(event): void =>
					onChangeHandler(setTitle, event.target.value)
				}
				value={title}
			/>

			<Title textLighter>Description</Title>

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

			<Title textLighter>Fill Opacity: </Title>

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

			<Title textLighter>Null/Zero values: </Title>

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

			<Title textLighter>Panel Time Preference</Title>

			<TextContainer noButtonMargin>
				<Dropdown
					overlay={
						<Menu>
							<Menu.Item>
								<Typography>Global Time</Typography>
							</Menu.Item>
						</Menu>
					}
				>
					<Button>asd</Button>
				</Dropdown>
			</TextContainer>
		</Container>
	);
};

interface RightContainerProps {
	selectedGraph: GRAPH_TYPES;
}

export default RightContainer;
