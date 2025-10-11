export interface YAxisUnitSelectorProps {
	value: string | undefined;
	onChange: (value: UniversalYAxisUnit) => void;
	placeholder?: string;
	loading?: boolean;
	disabled?: boolean;
	'data-testid'?: string;
}

export enum UniversalYAxisUnit {
	// Time
	WEEKS = 'wk',
	DAYS = 'd',
	HOURS = 'h',
	MINUTES = 'min',
	SECONDS = 's',
	MICROSECONDS = 'us',
	MILLISECONDS = 'ms',
	NANOSECONDS = 'ns',

	// Data
	BYTES = 'By',
	KILOBYTES = 'kBy',
	MEGABYTES = 'MBy',
	GIGABYTES = 'GBy',
	TERABYTES = 'TBy',
	PETABYTES = 'PBy',
	EXABYTES = 'EBy',
	ZETTABYTES = 'ZBy',
	YOTTABYTES = 'YBy',

	// Data Rate
	BYTES_SECOND = 'By/s',
	KILOBYTES_SECOND = 'kBy/s',
	MEGABYTES_SECOND = 'MBy/s',
	GIGABYTES_SECOND = 'GBy/s',
	TERABYTES_SECOND = 'TBy/s',
	PETABYTES_SECOND = 'PBy/s',
	EXABYTES_SECOND = 'EBy/s',
	ZETTABYTES_SECOND = 'ZBy/s',
	YOTTABYTES_SECOND = 'YBy/s',

	// Bits
	BITS = 'bit',
	KILOBITS = 'kbit',
	MEGABITS = 'Mbit',
	GIGABITS = 'Gbit',
	TERABITS = 'Tbit',
	PETABITS = 'Pbit',
	EXABITS = 'Ebit',
	ZETTABITS = 'Zbit',
	YOTTABITS = 'Ybit',

	// Bit Rate
	BITS_SECOND = 'bit/s',
	KILOBITS_SECOND = 'kbit/s',
	MEGABITS_SECOND = 'Mbit/s',
	GIGABITS_SECOND = 'Gbit/s',
	TERABITS_SECOND = 'Tbit/s',
	PETABITS_SECOND = 'Pbit/s',
	EXABITS_SECOND = 'Ebit/s',
	ZETTABITS_SECOND = 'Zbit/s',
	YOTTABITS_SECOND = 'Ybit/s',

	// Count
	COUNT = '{count}',
	COUNT_SECOND = '{count}/s',
	COUNT_MINUTE = '{count}/min',

	// Operations
	OPS_SECOND = '{ops}/s',
	OPS_MINUTE = '{ops}/min',

	// Requests
	REQUESTS_SECOND = '{req}/s',
	REQUESTS_MINUTE = '{req}/min',

	// Reads/Writes
	READS_SECOND = '{read}/s',
	WRITES_SECOND = '{write}/s',
	READS_MINUTE = '{read}/min',
	WRITES_MINUTE = '{write}/min',

	// IO Operations
	IOOPS_SECOND = '{iops}/s',

	// Percent
	PERCENT = '%',
	PERCENT_UNIT = 'percentunit',
	NONE = '1',
}

export enum YAxisUnit {
	AWS_SECONDS = 'Seconds',
	UCUM_SECONDS = 's',
	OPEN_METRICS_SECONDS = 'seconds',

	AWS_MICROSECONDS = 'Microseconds',
	UCUM_MICROSECONDS = 'us',
	OPEN_METRICS_MICROSECONDS = 'microseconds',

	AWS_MILLISECONDS = 'Milliseconds',
	UCUM_MILLISECONDS = 'ms',
	OPEN_METRICS_MILLISECONDS = 'milliseconds',

	AWS_BYTES = 'Bytes',
	UCUM_BYTES = 'By',
	OPEN_METRICS_BYTES = 'bytes',

	AWS_KILOBYTES = 'Kilobytes',
	UCUM_KILOBYTES = 'kBy',
	OPEN_METRICS_KILOBYTES = 'kilobytes',

	AWS_MEGABYTES = 'Megabytes',
	UCUM_MEGABYTES = 'MBy',
	OPEN_METRICS_MEGABYTES = 'megabytes',

	AWS_GIGABYTES = 'Gigabytes',
	UCUM_GIGABYTES = 'GBy',
	OPEN_METRICS_GIGABYTES = 'gigabytes',

	AWS_TERABYTES = 'Terabytes',
	UCUM_TERABYTES = 'TBy',
	OPEN_METRICS_TERABYTES = 'terabytes',

	AWS_PETABYTES = 'Petabytes',
	UCUM_PETABYTES = 'PBy',
	OPEN_METRICS_PETABYTES = 'petabytes',

	AWS_EXABYTES = 'Exabytes',
	UCUM_EXABYTES = 'EBy',
	OPEN_METRICS_EXABYTES = 'exabytes',

	AWS_ZETTABYTES = 'Zettabytes',
	UCUM_ZETTABYTES = 'ZBy',
	OPEN_METRICS_ZETTABYTES = 'zettabytes',

	AWS_YOTTABYTES = 'Yottabytes',
	UCUM_YOTTABYTES = 'YBy',
	OPEN_METRICS_YOTTABYTES = 'yottabytes',

	AWS_BYTES_SECOND = 'Bytes/Second',
	UCUM_BYTES_SECOND = 'By/s',
	OPEN_METRICS_BYTES_SECOND = 'bytes_per_second',

	AWS_KILOBYTES_SECOND = 'Kilobytes/Second',
	UCUM_KILOBYTES_SECOND = 'kBy/s',
	OPEN_METRICS_KILOBYTES_SECOND = 'kilobytes_per_second',

	AWS_MEGABYTES_SECOND = 'Megabytes/Second',
	UCUM_MEGABYTES_SECOND = 'MBy/s',
	OPEN_METRICS_MEGABYTES_SECOND = 'megabytes_per_second',

	AWS_GIGABYTES_SECOND = 'Gigabytes/Second',
	UCUM_GIGABYTES_SECOND = 'GBy/s',
	OPEN_METRICS_GIGABYTES_SECOND = 'gigabytes_per_second',

	AWS_TERABYTES_SECOND = 'Terabytes/Second',
	UCUM_TERABYTES_SECOND = 'TBy/s',
	OPEN_METRICS_TERABYTES_SECOND = 'terabytes_per_second',

	AWS_PETABYTES_SECOND = 'Petabytes/Second',
	UCUM_PETABYTES_SECOND = 'PBy/s',
	OPEN_METRICS_PETABYTES_SECOND = 'petabytes_per_second',

	AWS_EXABYTES_SECOND = 'Exabytes/Second',
	UCUM_EXABYTES_SECOND = 'EBy/s',
	OPEN_METRICS_EXABYTES_SECOND = 'exabytes_per_second',

	AWS_ZETTABYTES_SECOND = 'Zettabytes/Second',
	UCUM_ZETTABYTES_SECOND = 'ZBy/s',
	OPEN_METRICS_ZETTABYTES_SECOND = 'zettabytes_per_second',

	AWS_YOTTABYTES_SECOND = 'Yottabytes/Second',
	UCUM_YOTTABYTES_SECOND = 'YBy/s',
	OPEN_METRICS_YOTTABYTES_SECOND = 'yottabytes_per_second',

	AWS_BITS = 'Bits',
	UCUM_BITS = 'bit',
	OPEN_METRICS_BITS = 'bits',

	AWS_KILOBITS = 'Kilobits',
	UCUM_KILOBITS = 'kbit',
	OPEN_METRICS_KILOBITS = 'kilobits',

	AWS_MEGABITS = 'Megabits',
	UCUM_MEGABITS = 'Mbit',
	OPEN_METRICS_MEGABITS = 'megabits',

	AWS_GIGABITS = 'Gigabits',
	UCUM_GIGABITS = 'Gbit',
	OPEN_METRICS_GIGABITS = 'gigabits',

	AWS_TERABITS = 'Terabits',
	UCUM_TERABITS = 'Tbit',
	OPEN_METRICS_TERABITS = 'terabits',

	AWS_PETABITS = 'Petabits',
	UCUM_PETABITS = 'Pbit',
	OPEN_METRICS_PETABITS = 'petabits',

	AWS_EXABITS = 'Exabits',
	UCUM_EXABITS = 'Ebit',
	OPEN_METRICS_EXABITS = 'exabits',

	AWS_ZETTABITS = 'Zettabits',
	UCUM_ZETTABITS = 'Zbit',
	OPEN_METRICS_ZETTABITS = 'zettabits',

	AWS_YOTTABITS = 'Yottabits',
	UCUM_YOTTABITS = 'Ybit',
	OPEN_METRICS_YOTTABITS = 'yottabits',

	AWS_BITS_SECOND = 'Bits/Second',
	UCUM_BITS_SECOND = 'bit/s',
	OPEN_METRICS_BITS_SECOND = 'bits_per_second',

	AWS_KILOBITS_SECOND = 'Kilobits/Second',
	UCUM_KILOBITS_SECOND = 'kbit/s',
	OPEN_METRICS_KILOBITS_SECOND = 'kilobits_per_second',

	AWS_MEGABITS_SECOND = 'Megabits/Second',
	UCUM_MEGABITS_SECOND = 'Mbit/s',
	OPEN_METRICS_MEGABITS_SECOND = 'megabits_per_second',

	AWS_GIGABITS_SECOND = 'Gigabits/Second',
	UCUM_GIGABITS_SECOND = 'Gbit/s',
	OPEN_METRICS_GIGABITS_SECOND = 'gigabits_per_second',

	AWS_TERABITS_SECOND = 'Terabits/Second',
	UCUM_TERABITS_SECOND = 'Tbit/s',
	OPEN_METRICS_TERABITS_SECOND = 'terabits_per_second',

	AWS_PETABITS_SECOND = 'Petabits/Second',
	UCUM_PETABITS_SECOND = 'Pbit/s',
	OPEN_METRICS_PETABITS_SECOND = 'petabits_per_second',

	AWS_EXABITS_SECOND = 'Exabits/Second',
	UCUM_EXABITS_SECOND = 'Ebit/s',
	OPEN_METRICS_EXABITS_SECOND = 'exabits_per_second',

	AWS_ZETTABITS_SECOND = 'Zettabits/Second',
	UCUM_ZETTABITS_SECOND = 'Zbit/s',
	OPEN_METRICS_ZETTABITS_SECOND = 'zettabits_per_second',

	AWS_YOTTABITS_SECOND = 'Yottabits/Second',
	UCUM_YOTTABITS_SECOND = 'Ybit/s',
	OPEN_METRICS_YOTTABITS_SECOND = 'yottabits_per_second',

	AWS_COUNT = 'Count',
	UCUM_COUNT = '{count}',
	OPEN_METRICS_COUNT = 'count',

	AWS_COUNT_SECOND = 'Count/Second',
	UCUM_COUNT_SECOND = '{count}/s',
	OPEN_METRICS_COUNT_SECOND = 'count_per_second',

	AWS_PERCENT = 'Percent',
	UCUM_PERCENT = '%',
	OPEN_METRICS_PERCENT = 'ratio',

	AWS_NONE = 'None',
	UCUM_NONE = '1',
	OPEN_METRICS_NONE = 'none',

	UCUM_NANOSECONDS = 'ns',
	OPEN_METRICS_NANOSECONDS = 'nanoseconds',

	UCUM_MINUTES = 'min',
	OPEN_METRICS_MINUTES = 'minutes',

	UCUM_HOURS = 'h',
	OPEN_METRICS_HOURS = 'hours',

	UCUM_DAYS = 'd',
	OPEN_METRICS_DAYS = 'days',

	UCUM_WEEKS = 'wk',
	OPEN_METRICS_WEEKS = 'weeks',

	UCUM_KIBIBYTES = 'KiBy',
	OPEN_METRICS_KIBIBYTES = 'kibibytes',

	UCUM_MEBIBYTES = 'MiBy',
	OPEN_METRICS_MEBIBYTES = 'mebibytes',

	UCUM_GIBIBYTES = 'GiBy',
	OPEN_METRICS_GIBIBYTES = 'gibibytes',

	UCUM_TEBIBYTES = 'TiBy',
	OPEN_METRICS_TEBIBYTES = 'tebibytes',

	UCUM_PEBIBYTES = 'PiBy',
	OPEN_METRICS_PEBIBYTES = 'pebibytes',

	UCUM_KIBIBYTES_SECOND = 'KiBy/s',
	OPEN_METRICS_KIBIBYTES_SECOND = 'kibibytes_per_second',

	UCUM_KIBIBITS_SECOND = 'Kibit/s',
	OPEN_METRICS_KIBIBITS_SECOND = 'kibibits_per_second',

	UCUM_MEBIBYTES_SECOND = 'MiBy/s',
	OPEN_METRICS_MEBIBYTES_SECOND = 'mebibytes_per_second',

	UCUM_MEBIBITS_SECOND = 'Mibit/s',
	OPEN_METRICS_MEBIBITS_SECOND = 'mebibits_per_second',

	UCUM_GIBIBYTES_SECOND = 'GiBy/s',
	OPEN_METRICS_GIBIBYTES_SECOND = 'gibibytes_per_second',

	UCUM_GIBIBITS_SECOND = 'Gibit/s',
	OPEN_METRICS_GIBIBITS_SECOND = 'gibibits_per_second',

	UCUM_TEBIBYTES_SECOND = 'TiBy/s',
	OPEN_METRICS_TEBIBYTES_SECOND = 'tebibytes_per_second',

	UCUM_TEBIBITS_SECOND = 'Tibit/s',
	OPEN_METRICS_TEBIBITS_SECOND = 'tebibits_per_second',

	UCUM_PEBIBYTES_SECOND = 'PiBy/s',
	OPEN_METRICS_PEBIBYTES_SECOND = 'pebibytes_per_second',

	UCUM_PEBIBITS_SECOND = 'Pibit/s',
	OPEN_METRICS_PEBIBITS_SECOND = 'pebibits_per_second',

	UCUM_TRUE_FALSE = '{bool}',
	OPEN_METRICS_TRUE_FALSE = 'boolean_true_false',

	UCUM_YES_NO = '{bool}',
	OPEN_METRICS_YES_NO = 'boolean_yes_no',

	UCUM_COUNTS_SECOND = '{count}/s',
	OPEN_METRICS_COUNTS_SECOND = 'counts_per_second',

	UCUM_OPS_SECOND = '{ops}/s',
	OPEN_METRICS_OPS_SECOND = 'ops_per_second',

	UCUM_REQUESTS_SECOND = '{requests}/s',
	OPEN_METRICS_REQUESTS_SECOND = 'requests_per_second',

	UCUM_REQUESTS_MINUTE = '{requests}/min',
	OPEN_METRICS_REQUESTS_MINUTE = 'requests_per_minute',

	UCUM_READS_SECOND = '{reads}/s',
	OPEN_METRICS_READS_SECOND = 'reads_per_second',

	UCUM_WRITES_SECOND = '{writes}/s',
	OPEN_METRICS_WRITES_SECOND = 'writes_per_second',

	UCUM_IOPS_SECOND = '{iops}/s',
	OPEN_METRICS_IOPS_SECOND = 'io_ops_per_second',

	UCUM_COUNTS_MINUTE = '{count}/min',
	OPEN_METRICS_COUNTS_MINUTE = 'counts_per_minute',

	UCUM_OPS_MINUTE = '{ops}/min',
	OPEN_METRICS_OPS_MINUTE = 'ops_per_minute',

	UCUM_READS_MINUTE = '{reads}/min',
	OPEN_METRICS_READS_MINUTE = 'reads_per_minute',

	UCUM_WRITES_MINUTE = '{writes}/min',
	OPEN_METRICS_WRITES_MINUTE = 'writes_per_minute',

	OPEN_METRICS_PERCENT_UNIT = 'percentunit',
}
