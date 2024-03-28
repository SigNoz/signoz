import { grey } from '@ant-design/colors';
import { Tag } from 'antd';
import styled from 'styled-components';

export const SearchContainer = styled.div`
	width: 100%;
	display: flex;
	align-items: center;
	gap: 0.2rem;
	padding: 0 0.2rem;
	box-sizing: border-box;
	border-radius: 3px;
`;

export const QueryChipContainer = styled.span`
	display: flex;
	align-items: center;
	margin-right: 0.5rem;
	&:hover {
		& > * {
			background: ${grey.primary}44;
		}
	}
`;

export const QueryChipItem = styled(Tag)`
	margin-right: 0.1rem;
`;
