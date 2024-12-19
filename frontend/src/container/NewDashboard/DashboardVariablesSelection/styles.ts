import { grey } from '@ant-design/colors';
import { Typography } from 'antd';
import styled from 'styled-components';

export const VariableContainer = styled.div`
	max-width: 100%;
	border: 1px solid ${grey[1]}66;
	border-radius: 2px;
	padding: 0;
	padding-left: 0.5rem;
	margin-right: 8px;
	display: flex;
	align-items: center;
	margin-bottom: 0.3rem;
	gap: 4px;
	padding: 4px;
`;

export const VariableName = styled(Typography)`
	font-size: 0.8rem;
	color: ${grey[0]};

	min-width: 100px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	flex: 1;
`;

export const VariableValue = styled(Typography)`
	font-size: 0.8rem;
	color: ${grey[0]};

	flex: 1;

	display: flex;
	justify-content: flex-end;
	align-items: center;
	max-width: 300px;
`;

export const SelectItemStyle = {
	minWidth: 120,
	fontSize: '0.8rem',
	width: '100%',
};
