import { ReactNode } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Select } from 'antd';
import styled from 'styled-components';

export function PipelineIndexIcon({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	return <Badge color="robin">{children}</Badge>;
}

export const ProcessorTypeWrapper = styled.div`
	display: flex;
	gap: 1rem;
	align-items: flex-start;
	margin-bottom: 1.5rem;
`;

export const ProcessorTypeContainer = styled.div`
	display: flex;
	flex-direction: column;
	padding-bottom: 0.5rem;
	gap: 0.313rem;
`;

export const Container = styled.div`
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	padding: 0rem;
	gap: 1rem;
	width: 100%;
`;

export const FormWrapper = styled.div`
	width: 100%;
`;

export const ProcessorType = styled.span`
	padding-bottom: 0.5rem;
`;

export const StyledSelect = styled(Select)`
	width: 12.5rem;
`;
