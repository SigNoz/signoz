import { Typography } from 'antd';
import { CSSProperties } from 'react';
import styled from 'styled-components';

export const tableStyles: CSSProperties = {
	cursor: 'unset',
};

export const Container = styled.div`
	display: flex;
	flex-direction: column;
`;

export const ErrorText = styled(Typography)`
	text-align: center;
`;

export const DateText = styled(Typography)`
	min-width: 145px;
`;
