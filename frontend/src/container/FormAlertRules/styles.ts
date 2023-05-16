import {
	Button,
	Card,
	Col,
	Form,
	Input,
	InputNumber,
	Row,
	Select,
	Typography,
} from 'antd';
import styled from 'styled-components';

const { TextArea } = Input;
const { Item } = Form;

export const PanelContainer = styled(Row)`
	flex-wrap: nowrap;
`;

export const StyledLeftContainer = styled(Col)`
	&&& {
		margin-right: 1rem;
	}
`;

export const MainFormContainer = styled(Form)``;

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		margin-top: 1rem;
		margin-bottom: 3rem;
	}
`;

export const ActionButton = styled(Button)`
	margin-right: 1rem;
`;

export const QueryButton = styled(Button)`
	&&& {
		display: flex;
		align-items: center;
		margin-right: 1rem;
	}
`;

export const QueryContainer = styled(Card)`
	&&& {
		margin-top: 1rem;
		min-height: 23.5%;
	}
`;

export const Container = styled.div`
	margin-top: 1rem;
	display: flex;
	flex-direction: column;
`;

export const StepHeading = styled.p`
	margin-top: 1rem;
	font-weight: bold;
`;

export const InlineSelect = styled(Select)`
	display: inline-block;
	width: 10% !important;
	margin-left: 0.2em;
	margin-right: 0.2em;
`;

export const SeveritySelect = styled(Select)`
	width: 25% !important;
`;

export const InputSmall = styled(Input)`
	width: 40% !important;
`;

export const FormContainer = styled(Card)`
	margin-top: 1rem;
	display: flex;
	flex-direction: column;
	border-radius: 4px;
`;

export const ThresholdInput = styled(InputNumber)`
	& > div {
		display: flex;
		align-items: center;
		& > .ant-input-number-group-addon {
			width: 130px;
			border: 0;
			background: transparent;
		}
		& > .ant-input-number {
			width: 50%;
			margin-left: 1em;
		}
	}
`;

export const TextareaMedium = styled(TextArea)`
	width: 70%;
`;

export const FormItemMedium = styled(Item)`
	width: 70%;
`;

export const ChannelSelectTip = styled(Typography.Text)`
	color: hsla(0, 0%, 100%, 0.3);
`;
