import { grey } from '@ant-design/colors';
import { Typography } from 'antd';
import styled from 'styled-components';

export const VariableContainer = styled.div`
	border: 1px solid ${grey[1]}66;
	border-radius: 2px;
	padding: 0;
	padding-left: 0.5rem;
	display: flex;
	align-items: center;
	margin-bottom: 0.3rem;
`;

export const VariableName = styled(Typography)`
	font-size: 0.8rem;
	font-style: italic;
	color: ${grey[0]};
`;
