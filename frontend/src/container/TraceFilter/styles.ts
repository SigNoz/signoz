import {
	AutoComplete as AutoCompleteComponent,
	Select as SelectComponent,
	Typography,
} from 'antd';
import styled from 'styled-components';

export const InfoWrapper = styled(Typography)`
	padding-top: 1rem;

	font-style: italic;

	font-size: 1rem;
`;

export const Select = styled(SelectComponent)`
	min-width: 180px;
`;

export const AutoComplete = styled(AutoCompleteComponent)`
	min-width: 180px;
`;
