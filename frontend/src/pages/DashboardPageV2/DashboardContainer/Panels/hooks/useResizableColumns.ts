import {
	SyntheticEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { TableProps } from 'antd';
import type { ResizeCallbackData } from 'react-resizable';
import { debounce } from 'lodash-es';

import ResizableHeader, {
	ResizableHeaderProps,
} from '../components/ResizableTable/ResizableHeader';
import {
	ColumnWidths,
	readColumnWidths,
	writeColumnWidths,
} from '../utils/columnWidthStorage';

type Columns<T> = NonNullable<TableProps<T>['columns']>;
type Column<T> = Columns<T>[number];

// Starting width for a column with no stored or column-declared width. Also the
// floor that makes every column resizable (a column needs a width to get a grip).
const DEFAULT_COLUMN_WIDTH = 180;
// Coalesce the burst of resize events during a drag into a single write.
const PERSIST_DEBOUNCE_MS = 400;

// A column's key for width storage: its antd `key`, falling back to `dataIndex`.
// Both Table and List columns set `key`, so this is effectively always present.
function getColumnKey<T>(column: Column<T>): string | undefined {
	const raw =
		'key' in column && column.key != null
			? column.key
			: (column as { dataIndex?: unknown }).dataIndex;
	if (typeof raw === 'string') {
		return raw;
	}
	if (typeof raw === 'number') {
		return String(raw);
	}
	return undefined;
}

interface UseResizableColumnsArgs<T> {
	/** Scopes the persisted widths so each panel resizes independently. */
	panelId: string;
	columns: Columns<T>;
	defaultWidth?: number;
	/**
	 * Column keys that should stay width-less (flexible) unless the user has
	 * resized them — they absorb the remaining table width under `tableLayout:
	 * fixed` so the table fits its container (e.g. the List panel's `body`).
	 */
	flexColumns?: string[];
}

interface UseResizableColumnsResult<T> {
	columns: Columns<T>;
	components: TableProps<T>['components'];
}

/**
 * Makes an antd Table's columns user-resizable, persisting each panel's widths to
 * localStorage so they survive reloads. Returns the merged columns (seeded with
 * stored/default widths and an `onHeaderCell` resize handler) plus the `components`
 * override that swaps in the resizable header cell. Shared by the Table and List
 * panel renderers.
 */
export function useResizableColumns<T>({
	panelId,
	columns,
	defaultWidth = DEFAULT_COLUMN_WIDTH,
	flexColumns,
}: UseResizableColumnsArgs<T>): UseResizableColumnsResult<T> {
	const flexKeys = useMemo(() => new Set(flexColumns ?? []), [flexColumns]);
	// Live widths keyed by column key. Seeded from localStorage so a resized
	// panel renders at its saved widths on first paint.
	const [widths, setWidths] = useState<ColumnWidths>(() =>
		readColumnWidths(panelId),
	);

	// The same renderer instance can be reused across panels (e.g. switching the
	// edited panel), so re-seed from storage whenever the panel identity changes.
	useEffect(() => {
		setWidths(readColumnWidths(panelId));
	}, [panelId]);

	// Debounced persist, recreated per panel so a trailing call always writes to
	// the right entry; cancelled on unmount/panel change to drop pending writes.
	const persist = useMemo(
		() =>
			debounce((next: ColumnWidths) => {
				writeColumnWidths(panelId, next);
			}, PERSIST_DEBOUNCE_MS),
		[panelId],
	);
	useEffect(() => (): void => persist.cancel(), [persist]);

	// Mirror the latest widths so the resize handler can derive the next map
	// without depending on (and thus rebuilding) on every width change.
	const widthsRef = useRef(widths);
	widthsRef.current = widths;

	const handleResize = useCallback(
		(key: string) =>
			(_e: SyntheticEvent<Element>, { size }: ResizeCallbackData): void => {
				const next = { ...widthsRef.current, [key]: Math.round(size.width) };
				widthsRef.current = next;
				setWidths(next);
				persist(next);
			},
		[persist],
	);

	const resizableColumns = useMemo<Columns<T>>(
		() =>
			columns.map((column) => {
				const key = getColumnKey(column);
				// Flex columns stay width-less (so they fill the remaining width) until
				// the user resizes them; everything else falls back to the default.
				const isFlex = key !== undefined && flexKeys.has(key);
				const width =
					(key ? widths[key] : undefined) ??
					(column.width as number | undefined) ??
					(isFlex ? undefined : defaultWidth);
				return {
					...column,
					width,
					onHeaderCell: (): ResizableHeaderProps => ({
						width,
						onResize: key && width ? handleResize(key) : undefined,
					}),
				} as Column<T>;
			}),
		[columns, widths, defaultWidth, flexKeys, handleResize],
	);

	const components = useMemo<TableProps<T>['components']>(
		() => ({ header: { cell: ResizableHeader } }),
		[],
	);

	return { columns: resizableColumns, components };
}
