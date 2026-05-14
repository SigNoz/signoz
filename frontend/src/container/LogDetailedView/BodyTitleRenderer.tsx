import { useCallback } from 'react';
import { useCopyToClipboard } from 'react-use';
import { orange } from '@ant-design/colors';
import { Settings } from '@signozhq/icons';
import { Dropdown, MenuProps } from 'antd';
import {
	negateOperator,
	OPERATORS,
	QUERY_BUILDER_FUNCTIONS,
} from 'constants/antlrQueryConstants';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ICurrentQueryData } from 'hooks/useHandleExplorerTabChange';
import { useNotifications } from 'hooks/useNotifications';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { useAppContext } from 'providers/App/App';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

import { TitleWrapper } from './BodyTitleRenderer.styles';
import { DROPDOWN_KEY } from './constant';
import { BodyTitleRendererProps } from './LogDetailedView.types';
import {
	generateFieldKeyForArray,
	getDataTypes,
	removeObjectFromString,
} from './utils';

function BodyTitleRenderer({
	title,
	parentIsArray = false,
	nodeKey,
	value,
	handleChangeSelectedView,
}: BodyTitleRendererProps): JSX.Element {
	const { onAddToQuery } = useActiveLog();
	const { stagedQuery, updateQueriesData } = useQueryBuilder();

	const { featureFlags } = useAppContext();
	const [, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();
	const viewName = useGetSearchQueryParam(QueryParams.viewName) || '';

	const cleanedNodeKey = removeObjectFromString(nodeKey);
	const isBodyJsonQueryEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.USE_JSON_BODY)
			?.active || false;

	// Group by is supported only for body json query enabled and not for array elements
	const isGroupBySupported =
		isBodyJsonQueryEnabled && !cleanedNodeKey.includes('[]');

	const filterHandler = (isFilterIn: boolean) => (): void => {
		if (parentIsArray) {
			onAddToQuery(
				generateFieldKeyForArray(
					cleanedNodeKey,
					getDataTypes(value),
					isBodyJsonQueryEnabled,
				),
				`${value}`,
				isFilterIn
					? QUERY_BUILDER_FUNCTIONS.HAS
					: negateOperator(QUERY_BUILDER_FUNCTIONS.HAS),
				parentIsArray ? getDataTypes([value]) : getDataTypes(value),
			);
		} else {
			onAddToQuery(
				`body.${cleanedNodeKey}`,
				`${value}`,
				isFilterIn ? OPERATORS['='] : OPERATORS['!='],
				getDataTypes(value),
			);
		}
	};

	const groupByHandler = useCallback((): void => {
		if (!stagedQuery) {
			return;
		}

		const groupByKey = parentIsArray
			? generateFieldKeyForArray(
					cleanedNodeKey,
					getDataTypes(value),
					isBodyJsonQueryEnabled,
				)
			: `body.${cleanedNodeKey}`;

		const fieldDataType = getDataTypes(value);
		const normalizedDataType: DataTypes | undefined = Object.values(
			DataTypes,
		).includes(fieldDataType as DataTypes)
			? (fieldDataType as DataTypes)
			: undefined;

		const updatedQuery = updateQueriesData(
			stagedQuery,
			'queryData',
			(item, index) => {
				if (index === 0) {
					const newGroupByItem: BaseAutocompleteData = {
						key: groupByKey,
						type: '',
						dataType: normalizedDataType,
					};

					return { ...item, groupBy: [...(item.groupBy || []), newGroupByItem] };
				}

				return item;
			},
		);

		const queryData: ICurrentQueryData = {
			name: viewName,
			id: updatedQuery.id,
			query: updatedQuery,
		};

		handleChangeSelectedView?.(ExplorerViews.TIMESERIES, queryData);
	}, [
		cleanedNodeKey,
		handleChangeSelectedView,
		isBodyJsonQueryEnabled,
		parentIsArray,
		stagedQuery,
		updateQueriesData,
		value,
		viewName,
	]);

	const onClickHandler: MenuProps['onClick'] = (props): void => {
		const mapper = {
			[DROPDOWN_KEY.FILTER_IN]: filterHandler(true),
			[DROPDOWN_KEY.FILTER_OUT]: filterHandler(false),
			[DROPDOWN_KEY.GROUP_BY]: groupByHandler,
		};

		const handler = mapper[props.key];

		if (handler) {
			handler();
		}
	};

	const menu: MenuProps = {
		items: [
			{
				key: DROPDOWN_KEY.FILTER_IN,
				label: `Filter for ${value}`,
			},
			{
				key: DROPDOWN_KEY.FILTER_OUT,
				label: `Filter out ${value}`,
			},
			...(isGroupBySupported
				? [
						{
							key: DROPDOWN_KEY.GROUP_BY,
							label: `Group by ${nodeKey}`,
						},
					]
				: []),
		],
		onClick: onClickHandler,
	};

	const handleNodeClick = useCallback(
		(e: React.MouseEvent): void => {
			// Prevent tree node expansion/collapse
			e.stopPropagation();
			let copyText: string;

			// Check if value is an object or array
			const isObject = typeof value === 'object' && value !== null;

			if (isObject) {
				// For objects/arrays, stringify the entire structure
				copyText = JSON.stringify(value, null, 2);
			} else if (parentIsArray) {
				// array elements
				copyText = `${value}`;
			} else {
				// primitive values
				const valueStr = typeof value === 'string' ? value : String(value);
				copyText = valueStr;
			}

			setCopy(copyText);

			if (copyText) {
				const notificationMessage = isObject
					? `${cleanedNodeKey} object copied to clipboard`
					: `${cleanedNodeKey} copied to clipboard`;

				notifications.success({
					message: notificationMessage,
					key: notificationMessage,
				});
			}
		},
		[cleanedNodeKey, parentIsArray, setCopy, value, notifications],
	);

	return (
		<TitleWrapper onClick={handleNodeClick}>
			{typeof value !== 'object' && (
				<span
					onClick={(e): void => {
						e.stopPropagation();
						e.preventDefault();
					}}
					onMouseDown={(e): void => e.preventDefault()}
				>
					<Dropdown
						menu={menu}
						trigger={['click']}
						dropdownRender={(originNode): React.ReactNode => (
							<div data-log-detail-ignore="true">{originNode}</div>
						)}
					>
						<Settings style={{ marginRight: 8 }} className="hover-reveal" />
					</Dropdown>
				</span>
			)}
			{title.toString()}{' '}
			{!parentIsArray && typeof value !== 'object' && (
				<span>
					: <span style={{ color: orange[6] }}>{`${value}`}</span>
				</span>
			)}
		</TitleWrapper>
	);
}

export default BodyTitleRenderer;
