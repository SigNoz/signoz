import { ReactNode } from 'react';
import { Avatar } from '@signozhq/ui/avatar';
import { Select } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export function PipelineIndexIcon({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	return (
		<Avatar
			size="sm"
			style={{
				backgroundColor: themeColors.navyBlue,
				fontSize: '0.875rem',
				lineHeight: '1.375rem',
			}}
		>
			{children}
		</Avatar>
	);
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
