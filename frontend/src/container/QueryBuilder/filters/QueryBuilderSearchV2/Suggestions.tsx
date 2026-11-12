import { useMemo } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { isEmpty, isObject } from 'lodash-es';
import { Check, Zap } from '@signozhq/icons';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { getTagToken } from './utils';
import { DropdownState } from './QueryBuilderSearchV2';

import './Suggestions.styles.scss';

interface ISuggestionsProps {
	label: string;
	value: BaseAutocompleteData | string;
	option: DropdownState;
	searchValue: string;
}

function Suggestions(props: ISuggestionsProps): React.ReactElement {
	const { label, value, option, searchValue } = props;

	const optionType = useMemo(() => {
		if (isObject(value)) {
			return value.type;
		}
		return '';
	}, [value]);

	const dataType = useMemo(() => {
		if (isObject(value)) {
			return value.dataType;
		}
		return '';
	}, [value]);

	const { tagValue } = getTagToken(searchValue);

	const labelTextStyle =
		option === DropdownState.OPERATOR
			? ({ variant: 'code', weight: 'medium' } as const)
			: ({ variant: 'paragraph', weight: 'regular' } as const);

	return (
		<div className="option">
			{!isEmpty(optionType) && isObject(value) ? (
				<Tooltip title={value.key} placement="topLeft">
					<div className="container">
						<section className="left-section">
							{value.isIndexed ? (
								<Zap size={12} fill={Color.BG_AMBER_500} />
							) : (
								<div className="dot" />
							)}
							<div className="value">
								<Typography
									variant="paragraph"
									size="base"
									weight="regular"
									color="secondary"
									as="p"
									textOverflow="ellipsis"
								>
									{label}
								</Typography>
							</div>
						</section>
						<section className="right-section">
							<div className="data-type">
								<Typography
									variant="paragraph"
									size="base"
									weight="regular"
									color="inherit"
									as="p"
									textOverflow="visible"
								>
									{value.dataType}
								</Typography>
							</div>
							<section className={cx('type-tag', value.type)}>
								<div className="dot" />
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="inherit"
									as="span"
									textOverflow="wrap"
								>
									{value.type}
								</Typography>
							</section>
						</section>
					</div>
				</Tooltip>
			) : (
				<Tooltip title={label} placement="topLeft">
					<div className="container-without-tag">
						<section className="left">
							<div className="dot" />
							<div className={cx('value', option)}>
								<Typography
									{...labelTextStyle}
									size="base"
									color="secondary"
									as="p"
									textOverflow="ellipsis"
								>
									{`${label}`}
								</Typography>
							</div>
						</section>
						<section className="right">
							{dataType && (
								<div className="data-type">
									<Typography
										variant="paragraph"
										size="base"
										weight="regular"
										color="inherit"
										as="p"
										textOverflow="visible"
									>
										{dataType}
									</Typography>
								</div>
							)}
							{tagValue.includes(label) && <Check size={14} />}
						</section>
					</div>
				</Tooltip>
			)}
		</div>
	);
}

export default Suggestions;
