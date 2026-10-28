import { Card } from 'antd';
import styled from 'styled-components';

export const StepHeading = styled.p`
	margin-top: 1rem;
	font-weight: bold;
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
