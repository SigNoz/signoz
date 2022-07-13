import { Typography } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { blue } from '@ant-design/colors'
const CategoryHeadingText = styled(Typography.Text)`
	font-size: 0.9rem;
`;

export function CategoryHeading({ children }) {
	return <CategoryHeadingText type="secondary">{children}</CategoryHeadingText>;
}

export const QueryFieldContainer = styled.div`
	padding: 0.25rem 0.5rem;
	margin: 0.1rem 0.5rem 0;
	display: flex;
	flex-direction: row;
	border-radius: 0.25rem;

	&:hover {
		background: ${blue[5]};
	}
`;
