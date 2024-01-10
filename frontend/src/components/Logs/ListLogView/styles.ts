import { Card, Typography } from 'antd';
import styled from 'styled-components';
import { getActiveLogBackground } from 'utils/logs';

export const Container = styled(Card)<{
	$isActiveLog: boolean;
}>`
	width: 100% !important;
	margin-bottom: 0.3rem;
	cursor: pointer;
	.ant-card-body {
		padding: 0.3rem 0.6rem;
	}

	${({ $isActiveLog }): string => getActiveLogBackground($isActiveLog)}
`;

export const Text = styled(Typography.Text)`
	&&& {
		min-width: 1.5rem;
		white-space: nowrap;
	}
`;

export const TextContainer = styled.div`
	display: flex;
	overflow: hidden;
	width: 100%;
`;

export const LogContainer = styled.div`
	margin-left: 0.5rem;
	display: flex;
	flex-direction: column;
	gap: 6px;
`;

export const LogText = styled.div`
	display: inline-block;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
`;

export const SelectedLog = styled.div`
	display: flex;
	width: 100%;
	overflow: hidden;
`;
