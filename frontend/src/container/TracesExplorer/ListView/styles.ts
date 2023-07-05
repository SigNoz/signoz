import { Typography } from 'antd';
import { CSSProperties } from 'react';
import styled from 'styled-components';

export const tableStyles: CSSProperties = {
	cursor: 'pointer',
};

export const Container = styled.div`
	display: flex;
	flex-direction: column;
	gap: 15px;
`;

export const ErrorText = styled(Typography)`
	text-align: center;
`;

export const DateText = styled(Typography)`
	min-width: 145px;
`;
