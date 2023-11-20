import { UploadOutlined } from '@ant-design/icons';
import {
	Button,
	Divider,
	Input,
	Select,
	Space,
	Switch,
	Typography,
} from 'antd';
import InputComponent from 'components/Input';
import TimePreference from 'components/TimePreferenceDropDown';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import GraphTypes from 'container/NewDashboard/ComponentsSlider/menuItems';
import history from 'lib/history';
import { Dispatch, SetStateAction, useCallback } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';

import { panelTypeVsThreshold } from './constants';
import { Container, Title } from './styles';
import ThresholdSelector from './Threshold/ThresholdSelector';
import { ThresholdProps } from './Threshold/types';
import { timePreferance } from './timeItems';
import YAxisUnitSelector from './YAxisUnitSelector';

const { TextArea } = Input;
const { Option } = Select;

function RightContainer({
	description,
	setDescription,
	setTitle,
	title,
	selectedGraph,
	setSelectedTime,
	selectedTime,
	yAxisUnit,
	setYAxisUnit,
	setGraphHandler,
	thresholds,
	setThresholds,
	selectedWidget,
	isFillSpans,
	setIsFillSpans,
}: RightContainerProps): JSX.Element {
	const onChangeHandler = useCallback(
		(setFunc: Dispatch<SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const selectedGraphType =
		GraphTypes.find((e) => e.name === selectedGraph)?.display || '';

	const onCreateAlertsHandler = useCallback(() => {
		if (!selectedWidget) return;

		history.push(
			`${ROUTES.ALERTS_NEW}?${QueryParams.compositeQuery}=${encodeURIComponent(
				JSON.stringify(selectedWidget?.query),
			)}`,
		);
	}, [selectedWidget]);

	const allowThreshold = panelTypeVsThreshold[selectedGraph];

	return (
		<Container>
			<Title>Panel Type</Title>
			<Select
				onChange={setGraphHandler}
				value={selectedGraph}
				disabled
				style={{ width: '100%', marginBottom: 24 }}
			>
				{GraphTypes.map((item) => (
					<Option key={item.name} value={item.name}>
						{item.display}
					</Option>
				))}
			</Select>
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

			<Title light="true">Description</Title>

			<TextArea
				placeholder="Write something describing the  panel"
				bordered
				allowClear
				value={description}
				onChange={(event): void =>
					onChangeHandler(setDescription, event.target.value)
				}
			/>

			{/* <TextContainer>
				<Typography>Stacked Graphs :</Typography>
				<Switch
					checked={stacked}
					onChange={(): void => {
						setStacked((value) => !value);
					}}
				/>
			</TextContainer> */}

			{/* <Title light={'true'}>Fill Opacity: </Title> */}

			{/* <Slider
				value={parseInt(opacity, 10)}
				marks={{
					0: '0',
					33: '33',
					66: '66',
					100: '100',
				}}
				onChange={(number): void => onChangeHandler(setOpacity, number.toString())}
				step={1}
			/> */}

			{/* <Title light={'true'}>Null/Zero values: </Title>

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
			</NullButtonContainer> */}

			<Space style={{ marginTop: 10 }} direction="vertical">
				<Typography>Fill span gaps</Typography>

				<Switch
					checked={isFillSpans}
					onChange={(checked): void => setIsFillSpans(checked)}
				/>
			</Space>

			<Title light="true">Panel Time Preference</Title>

			<Space direction="vertical">
				<TimePreference
					{...{
						selectedTime,
						setSelectedTime,
					}}
				/>

				<YAxisUnitSelector
					defaultValue={yAxisUnit}
					onSelect={setYAxisUnit}
					fieldLabel={selectedGraphType === 'Value' ? 'Unit' : 'Y Axis Unit'}
				/>

				{selectedWidget?.panelTypes !== PANEL_TYPES.TABLE && (
					<Button icon={<UploadOutlined />} onClick={onCreateAlertsHandler}>
						Create Alerts from Queries
					</Button>
				)}
			</Space>

			{allowThreshold && (
				<>
					<Divider />
					<ThresholdSelector
						thresholds={thresholds}
						setThresholds={setThresholds}
						yAxisUnit={yAxisUnit}
						selectedGraph={selectedGraph}
					/>
				</>
			)}
		</Container>
	);
}

interface RightContainerProps {
	title: string;
	setTitle: Dispatch<SetStateAction<string>>;
	description: string;
	setDescription: Dispatch<SetStateAction<string>>;
	stacked: boolean;
	setStacked: Dispatch<SetStateAction<boolean>>;
	opacity: string;
	setOpacity: Dispatch<SetStateAction<string>>;
	selectedNullZeroValue: string;
	setSelectedNullZeroValue: Dispatch<SetStateAction<string>>;
	selectedGraph: PANEL_TYPES;
	setSelectedTime: Dispatch<SetStateAction<timePreferance>>;
	selectedTime: timePreferance;
	yAxisUnit: string;
	setYAxisUnit: Dispatch<SetStateAction<string>>;
	setGraphHandler: (type: PANEL_TYPES) => void;
	thresholds: ThresholdProps[];
	setThresholds: Dispatch<SetStateAction<ThresholdProps[]>>;
	selectedWidget?: Widgets;
	isFillSpans: boolean;
	setIsFillSpans: Dispatch<SetStateAction<boolean>>;
}

RightContainer.defaultProps = {
	selectedWidget: undefined,
};

export default RightContainer;
