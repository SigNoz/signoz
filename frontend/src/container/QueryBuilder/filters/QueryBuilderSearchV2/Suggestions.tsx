import './Suggestions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { isEmpty, isObject } from 'lodash-es';
import { Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Option } from './QueryBuilderSearchV2';

function Suggestions(props: Option): React.ReactElement {
	const { label, value } = props;

	const optionType = useMemo(() => {
		if (isObject(value)) {
			return value.type;
		}
		return '';
	}, [value]);

	const [truncated, setTruncated] = useState<boolean>(false);

	return (
		<div className="option">
			{!isEmpty(optionType) && isObject(value) ? (
				<Tooltip title={truncated ? `${value.key}` : ''} placement="topLeft">
					<div className="container">
						<section className="left-section">
							{value.isIndexed ? (
								<Zap size={12} fill={Color.BG_AMBER_500} />
							) : (
								<div className="dot" />
							)}
							<Typography.Text
								className="text value"
								ellipsis={{ onEllipsis: (ellipsis): void => setTruncated(ellipsis) }}
							>
								{label}
							</Typography.Text>
						</section>
						<section className="right-section">
							<Typography.Text className="data-type">{value.dataType}</Typography.Text>
							<section className={cx('type-tag', value.type)}>
								<div className="dot" />
								{value.type}
							</section>
						</section>
					</div>
				</Tooltip>
			) : (
				<Tooltip title={truncated ? label : ''} placement="topLeft">
					<div className="container-without-tag">
						<div className="dot" />
						<Typography.Text
							className="text value"
							ellipsis={{ onEllipsis: (ellipsis): void => setTruncated(ellipsis) }}
						>
							{label}
						</Typography.Text>
					</div>
				</Tooltip>
			)}
		</div>
	);
}

export default Suggestions;
