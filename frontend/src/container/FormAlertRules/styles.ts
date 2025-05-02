import { Button, Card, Col, Form, Input, Select, Typography } from 'antd';
import styled from 'styled-components';

const { TextArea } = Input;
const { Item } = Form;

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
	margin-left: 0.3em;
	margin-right: 0.3em;
`;

export const SeveritySelect = styled(Select)`
	width: 25% !important;
`;

export const VerticalLine = styled.div`
	border-left: 2px solid #e8e8e8; /* Adjust color and thickness as desired */
	padding-left: 20px; /* Adjust spacing to content as needed */
	margin-left: 20px; /* Adjust margin as desired */
	height: 100%; /* Adjust based on your layout needs */
`;

export const InputSmall = styled(Input)`
	width: 40% !important;
`;

export const FormContainer = styled(Card)`
	margin-top: 1rem;
	display: flex;
	flex-direction: column;
	border-radius: 4px;

	.ant-card-body {
		padding: 12px;
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

export const StepContainer = styled.div`
	margin-top: 2rem;
`;
