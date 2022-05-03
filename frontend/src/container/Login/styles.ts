import { Card } from 'antd';
import styled from 'styled-components';

export const FormWrapper = styled(Card)`
	display: flex;
	justify-content: center;
	max-width: 432px;
	flex: 1;
	align-items: flex-start;
`;

export const Label = styled.label`
	margin-bottom: 11px;
	margin-top: 19px;
	display: inline-block;
	font-size: 1rem;
	line-height: 24px;
`;

export const FormContainer = styled.form`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
`;

export const ParentContainer = styled.div`
	width: 100%;
`;
