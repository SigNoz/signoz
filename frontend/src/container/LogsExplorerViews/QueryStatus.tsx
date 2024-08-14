import './QueryStatus.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Spin } from 'antd';
import { CircleCheck } from 'lucide-react';
import React, { useMemo } from 'react';

interface IQueryStatusProps {
	loading: boolean;
	error: boolean;
	success: boolean;
}

export default function QueryStatus(
	props: IQueryStatusProps,
): React.ReactElement {
	const { loading, error, success } = props;

	const content = useMemo((): React.ReactElement => {
		if (loading) {
			return <Spin spinning size="small" indicator={<LoadingOutlined spin />} />;
		}
		if (error) {
			return (
				<img
					src="/Icons/solid-x-circle.svg"
					alt="header"
					className="error"
					style={{ height: '14px', width: '14px' }}
				/>
			);
		}
		if (success) {
			return (
				<CircleCheck className="success" size={14} fill={Color.BG_ROBIN_500} />
			);
		}
		return <div />;
	}, [error, loading, success]);
	return <div className="query-status">{content}</div>;
}
