import { Button, Input, Card, Select } from 'antd';
import styled from 'styled-components';

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
	margin-left: 1em;
	margin-right: 1em;
`;

export const SeveritySelect = styled(Select)`
	width: 15% !important;
`;

export const InputSmall = styled(Input)`
	width: 25% !important;
`;
 

export const FormContainer = styled.div`
padding: 2em;
margin-top: 1rem;
display: flex;
flex-direction: column;
background: #262626;
border-radius: 4px;
`;



export const ThresholdInput = styled(Input)`
	&&& {
		width: 20%;
	}
`;