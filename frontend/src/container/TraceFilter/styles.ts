import {
	AutoComplete as AutoCompleteComponent,
	Card as CardComponent,
	Form as FormComponent,
	Select as SelectComponent,
	Typography,
} from 'antd';
import styled from 'styled-components';

export const InfoWrapper = styled(Typography)`
	padding-top: 1rem;
	font-style: italic;
	font-size: 0.75rem;
`;

export const Select = styled(SelectComponent)`
	min-width: 180px;
`;

export const AutoComplete = styled(AutoCompleteComponent)`
	min-width: 180px;
`;

export const Form = styled(FormComponent)`
	margin-top: 1rem;
	margin-bottom: 1rem;
	gap: 0.5rem;
`;

export const Card = styled(CardComponent)`
	.ant-card-body {
		padding: 0.5rem;
	}
`;
