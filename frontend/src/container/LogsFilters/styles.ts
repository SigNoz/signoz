import { blue, grey } from '@ant-design/colors';
import { Typography } from 'antd';
import styled from 'styled-components';

export const CategoryContainer = styled.div`
	margin: 1rem 0;
	padding-left: 0.2rem;
`;

export const FieldContainer = styled(Typography.Text)`
	margin: 0.2rem 0;
	color: ${blue[4]};
`;

export const Field = styled.div<{ isDarkMode: boolean }>`
	border-radius: 0.5rem;
	padding: 0.3rem 0.5rem;
	height: 2rem;
	display: flex;
	justify-content: space-between;
	align-items: center;
	&:hover {
		background: ${({ isDarkMode }): string => (isDarkMode ? grey[7] : '#ddd')};
	}
`;

export const ExtractField = styled(Typography.Text)`
	color: ${blue[4]};
`;
