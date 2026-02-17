import { useEffect, useMemo, useState } from 'react';
import { Pagination, Skeleton } from 'antd';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { useListRoles } from 'api/generated/services/role';
import { RoletypesRoleDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { useTimezone } from 'providers/Timezone';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

import '../RolesSettings.styles.scss';

const PAGE_SIZE = 20;

function toAPIError(error: unknown): APIError {
	try {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	} catch (apiError) {
		if (apiError instanceof APIError) {
			return apiError;
		}
	}
	return new APIError({
		httpStatusCode: 500,
		error: {
			code: 'UNKNOWN_ERROR',
			message: 'An unexpected error occurred while fetching roles.',
			url: '',
			errors: [],
		},
	});
}

type DisplayItem =
	| { type: 'section'; label: string; count?: number }
	| { type: 'role'; role: RoletypesRoleDTO };

interface RolesListingTableProps {
	searchQuery: string;
}

function RolesListingTable({
	searchQuery,
}: RolesListingTableProps): JSX.Element {
	const { data, isLoading, isError, error } = useListRoles();
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const [currentPage, setCurrentPage] = useState(1);

	const roles = useMemo(() => data?.data?.data ?? [], [data]);

	const formatTimestamp = (date?: Date | string): string => {
		if (!date) {
			return '—';
		}
		const d = new Date(date);

		if (Number.isNaN(d.getTime())) {
			return '—';
		}

		return formatTimezoneAdjustedTimestamp(date, DATE_TIME_FORMATS.DASH_DATETIME);
	};

	const filteredRoles = useMemo(() => {
		if (!searchQuery.trim()) {
			return roles;
		}
		const query = searchQuery.toLowerCase();
		return roles.filter(
			(role) =>
				role.name?.toLowerCase().includes(query) ||
				role.description?.toLowerCase().includes(query),
		);
	}, [roles, searchQuery]);

	const managedRoles = useMemo(
		() => filteredRoles.filter((role) => role.type?.toLowerCase() === 'managed'),
		[filteredRoles],
	);
	const customRoles = useMemo(
		() => filteredRoles.filter((role) => role.type?.toLowerCase() === 'custom'),
		[filteredRoles],
	);

	// Combine managed + custom into a flat display list for pagination
	const displayList = useMemo((): DisplayItem[] => {
		const result: DisplayItem[] = [];

		if (managedRoles.length > 0) {
			result.push({ type: 'section', label: 'Managed roles' });
			managedRoles.forEach((role) => result.push({ type: 'role', role }));
		}
		if (customRoles.length > 0) {
			result.push({
				type: 'section',
				label: 'Custom roles',
				count: customRoles.length,
			});
			customRoles.forEach((role) => result.push({ type: 'role', role }));
		}
		return result;
	}, [managedRoles, customRoles]);

	const totalRoleCount = managedRoles.length + customRoles.length;

	// Paginate: count only role items, but include section headers contextually
	const paginatedItems = useMemo((): DisplayItem[] => {
		const startRole = (currentPage - 1) * PAGE_SIZE;
		const endRole = startRole + PAGE_SIZE;
		let roleIndex = 0;
		let lastSection: DisplayItem | null = null;
		const result: DisplayItem[] = [];

		for (const item of displayList) {
			if (item.type === 'section') {
				lastSection = item;
			} else {
				if (roleIndex >= startRole && roleIndex < endRole) {
					// Insert section header before first role in that section on this page
					if (lastSection) {
						result.push(lastSection);
						lastSection = null;
					}
					result.push(item);
				}
				roleIndex++;
			}
		}
		return result;
	}, [displayList, currentPage]);

	// Reset page when search changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery]);

	const showPaginationItem = (total: number, range: number[]): JSX.Element => (
		<>
			<span className="numbers">
				{range[0]} &#8212; {range[1]}
			</span>
			<span className="total"> of {total}</span>
		</>
	);

	if (isLoading) {
		return (
			<div className="roles-listing-table">
				<Skeleton active paragraph={{ rows: 5 }} />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="roles-listing-table">
				<ErrorInPlace error={toAPIError(error)} />
			</div>
		);
	}

	if (filteredRoles.length === 0) {
		return (
			<div className="roles-listing-table">
				<div className="roles-table-empty">
					{searchQuery ? 'No roles match your search.' : 'No roles found.'}
				</div>
			</div>
		);
	}

	const renderRow = (role: RoletypesRoleDTO): JSX.Element => (
		<div key={role.id} className="roles-table-row">
			<div className="roles-table-cell roles-table-cell--name">
				{role.name ?? '—'}
			</div>
			<div className="roles-table-cell roles-table-cell--description">
				<LineClampedText
					text={role.description ?? '—'}
					tooltipProps={{ overlayClassName: 'roles-description-tooltip' }}
				/>
			</div>
			<div className="roles-table-cell roles-table-cell--updated-at">
				{formatTimestamp(role.updatedAt)}
			</div>
			<div className="roles-table-cell roles-table-cell--created-at">
				{formatTimestamp(role.createdAt)}
			</div>
		</div>
	);

	return (
		<div className="roles-listing-table">
			<div className="roles-table-scroll-container">
				<div className="roles-table-inner">
					<div className="roles-table-header">
						<div className="roles-table-header-cell roles-table-header-cell--name">
							Name
						</div>
						<div className="roles-table-header-cell roles-table-header-cell--description">
							Description
						</div>
						<div className="roles-table-header-cell roles-table-header-cell--updated-at">
							Updated At
						</div>
						<div className="roles-table-header-cell roles-table-header-cell--created-at">
							Created At
						</div>
					</div>

					{paginatedItems.map((item) =>
						item.type === 'section' ? (
							<h3 key={`section-${item.label}`} className="roles-table-section-header">
								{item.label}
								{item.count !== undefined && (
									<span className="roles-table-section-header__count">{item.count}</span>
								)}
							</h3>
						) : (
							renderRow(item.role)
						),
					)}
				</div>
			</div>

			<Pagination
				current={currentPage}
				pageSize={PAGE_SIZE}
				total={totalRoleCount}
				showTotal={showPaginationItem}
				showSizeChanger={false}
				hideOnSinglePage
				onChange={(page): void => setCurrentPage(page)}
				className="roles-table-pagination"
			/>
		</div>
	);
}

export default RolesListingTable;
