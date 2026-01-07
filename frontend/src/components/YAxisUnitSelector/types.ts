export interface YAxisUnitSelectorProps {
	value: string | undefined;
	onChange: (value: UniversalYAxisUnit) => void;
	placeholder?: string;
	loading?: boolean;
	disabled?: boolean;
	'data-testid'?: string;
	source: YAxisSource;
	initialValue?: string;
}

export enum UniversalYAxisUnit {
	// Time
	DAYS = 'd',
	HOURS = 'h',
	MINUTES = 'min',
	SECONDS = 's',
	MICROSECONDS = 'us',
	MILLISECONDS = 'ms',
	NANOSECONDS = 'ns',
	DURATION_MS = 'dtdurationms',
	DURATION_S = 'dtdurations',
	DURATION_HMS = 'dthms',
	DURATION_DHMS = 'dtdhms',
	TIMETICKS = 'timeticks',
	CLOCK_MS = 'clockms',
	CLOCK_S = 'clocks',
	TIME_HERTZ = 'hertz',

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

	// Binary (IEC) Data
	BYTES_IEC = 'bytes',
	KIBIBYTES = 'KiBy',
	MEBIBYTES = 'MiBy',
	GIBIBYTES = 'GiBy',
	TEBIBYTES = 'TiBy',
	PEBIBYTES = 'PiBy',
	EXBIBYTES = 'EiBy',
	ZEBIBYTES = 'ZiBy',
	YOBIBYTES = 'YiBy',

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
	DATA_RATE_PACKETS_PER_SECOND = 'pps',

	// Binary (IEC) Data Rate
	KIBIBYTES_SECOND = 'KiBy/s',
	MEBIBYTES_SECOND = 'MiBy/s',
	GIBIBYTES_SECOND = 'GiBy/s',
	TEBIBYTES_SECOND = 'TiBy/s',
	PEBIBYTES_SECOND = 'PiBy/s',
	EXBIBYTES_SECOND = 'EiBy/s',
	ZEBIBYTES_SECOND = 'ZiBy/s',
	YOBIBYTES_SECOND = 'YiBy/s',

	// Bits
	BITS = 'bit',
	BITS_IEC = 'bits',
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

	// Binary (IEC) Bit Rate
	KIBIBITS_SECOND = 'Kibit/s',
	MEBIBITS_SECOND = 'Mibit/s',
	GIBIBITS_SECOND = 'Gibit/s',
	TEBIBITS_SECOND = 'Tibit/s',
	PEBIBITS_SECOND = 'Pibit/s',
	EXBIBITS_SECOND = 'Eibit/s',
	ZEBIBITS_SECOND = 'Zibit/s',
	YOBIBITS_SECOND = 'Yibit/s',

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

	// Boolean
	TRUE_FALSE = '{bool}',
	YES_NO = '{bool_yn}',
	ON_OFF = 'bool_on_off',

	// None
	NONE = '1',

	// Hash rate
	HASH_RATE_HASHES_PER_SECOND = 'Hs',
	HASH_RATE_KILOHASHES_PER_SECOND = 'KHs',
	HASH_RATE_MEGAHASHES_PER_SECOND = 'MHs',
	HASH_RATE_GIGAHASHES_PER_SECOND = 'GHs',
	HASH_RATE_TERAHASHES_PER_SECOND = 'THs',
	HASH_RATE_PETAHASHES_PER_SECOND = 'PHs',
	HASH_RATE_EXAHASHES_PER_SECOND = 'EHs',

	// Miscellaneous
	MISC_STRING = 'string',
	MISC_SHORT = 'short',
	MISC_HUMIDITY = 'humidity',
	MISC_DECIBEL = 'dB',
	MISC_HEXADECIMAL = 'hex',
	MISC_HEXADECIMAL_0X = 'hex0x',
	MISC_SCIENTIFIC_NOTATION = 'sci',
	MISC_LOCALE_FORMAT = 'locale',
	MISC_PIXELS = 'pixel',

	// Acceleration
	ACCELERATION_METERS_PER_SECOND_SQUARED = 'accMS2',
	ACCELERATION_FEET_PER_SECOND_SQUARED = 'accFS2',
	ACCELERATION_G_UNIT = 'accG',

	// Angular
	ANGULAR_DEGREE = 'degree',
	ANGULAR_RADIAN = 'radian',
	ANGULAR_GRADIAN = 'grad',
	ANGULAR_ARC_MINUTE = 'arcmin',
	ANGULAR_ARC_SECOND = 'arcsec',

	// Area
	AREA_SQUARE_METERS = 'areaM2',
	AREA_SQUARE_FEET = 'areaF2',
	AREA_SQUARE_MILES = 'areaMI2',

	// FLOPs
	FLOPS_FLOPS = 'flops',
	FLOPS_MFLOPS = 'mflops',
	FLOPS_GFLOPS = 'gflops',
	FLOPS_TFLOPS = 'tflops',
	FLOPS_PFLOPS = 'pflops',
	FLOPS_EFLOPS = 'eflops',
	FLOPS_ZFLOPS = 'zflops',
	FLOPS_YFLOPS = 'yflops',

	// Concentration
	CONCENTRATION_PPM = 'ppm',
	CONCENTRATION_PPB = 'conppb',
	CONCENTRATION_NG_M3 = 'conngm3',
	CONCENTRATION_NG_NORMAL_CUBIC_METER = 'conngNm3',
	CONCENTRATION_UG_M3 = 'conμgm3',
	CONCENTRATION_UG_NORMAL_CUBIC_METER = 'conμgNm3',
	CONCENTRATION_MG_M3 = 'conmgm3',
	CONCENTRATION_MG_NORMAL_CUBIC_METER = 'conmgNm3',
	CONCENTRATION_G_M3 = 'congm3',
	CONCENTRATION_G_NORMAL_CUBIC_METER = 'congNm3',
	CONCENTRATION_MG_PER_DL = 'conmgdL',
	CONCENTRATION_MMOL_PER_L = 'conmmolL',

	// Currency
	CURRENCY_USD = 'currencyUSD',
	CURRENCY_GBP = 'currencyGBP',
	CURRENCY_EUR = 'currencyEUR',
	CURRENCY_JPY = 'currencyJPY',
	CURRENCY_RUB = 'currencyRUB',
	CURRENCY_UAH = 'currencyUAH',
	CURRENCY_BRL = 'currencyBRL',
	CURRENCY_DKK = 'currencyDKK',
	CURRENCY_ISK = 'currencyISK',
	CURRENCY_NOK = 'currencyNOK',
	CURRENCY_SEK = 'currencySEK',
	CURRENCY_CZK = 'currencyCZK',
	CURRENCY_CHF = 'currencyCHF',
	CURRENCY_PLN = 'currencyPLN',
	CURRENCY_BTC = 'currencyBTC',
	CURRENCY_MBTC = 'currencymBTC',
	CURRENCY_UBTC = 'currencyμBTC',
	CURRENCY_ZAR = 'currencyZAR',
	CURRENCY_INR = 'currencyINR',
	CURRENCY_KRW = 'currencyKRW',
	CURRENCY_IDR = 'currencyIDR',
	CURRENCY_PHP = 'currencyPHP',
	CURRENCY_VND = 'currencyVND',

	// Datetime
	DATETIME_ISO = 'dateTimeAsIso',
	DATETIME_ISO_NO_DATE_IF_TODAY = 'dateTimeAsIsoNoDateIfToday',
	DATETIME_US = 'dateTimeAsUS',
	DATETIME_US_NO_DATE_IF_TODAY = 'dateTimeAsUSNoDateIfToday',
	DATETIME_LOCAL = 'dateTimeAsLocal',
	DATETIME_LOCAL_NO_DATE_IF_TODAY = 'dateTimeAsLocalNoDateIfToday',
	DATETIME_SYSTEM = 'dateTimeAsSystem',
	DATETIME_FROM_NOW = 'dateTimeFromNow',

	// Power/Electrical
	POWER_WATT = 'watt',
	POWER_KILOWATT = 'kwatt',
	POWER_MEGAWATT = 'megwatt',
	POWER_GIGAWATT = 'gwatt',
	POWER_MILLIWATT = 'mwatt',
	POWER_WATT_PER_SQUARE_METER = 'Wm2',
	POWER_VOLT_AMPERE = 'voltamp',
	POWER_KILOVOLT_AMPERE = 'kvoltamp',
	POWER_VOLT_AMPERE_REACTIVE = 'voltampreact',
	POWER_KILOVOLT_AMPERE_REACTIVE = 'kvoltampreact',
	POWER_WATT_HOUR = 'watth',
	POWER_WATT_HOUR_PER_KG = 'watthperkg',
	POWER_KILOWATT_HOUR = 'kwatth',
	POWER_KILOWATT_MINUTE = 'kwattm',
	POWER_AMPERE_HOUR = 'amph',
	POWER_KILOAMPERE_HOUR = 'kamph',
	POWER_MILLIAMPERE_HOUR = 'mamph',
	POWER_JOULE = 'joule',
	POWER_ELECTRON_VOLT = 'ev',
	POWER_AMPERE = 'amp',
	POWER_KILOAMPERE = 'kamp',
	POWER_MILLIAMPERE = 'mamp',
	POWER_VOLT = 'volt',
	POWER_KILOVOLT = 'kvolt',
	POWER_MILLIVOLT = 'mvolt',
	POWER_DECIBEL_MILLIWATT = 'dBm',
	POWER_OHM = 'ohm',
	POWER_KILOOHM = 'kohm',
	POWER_MEGAOHM = 'Mohm',
	POWER_FARAD = 'farad',
	POWER_MICROFARAD = 'µfarad',
	POWER_NANOFARAD = 'nfarad',
	POWER_PICOFARAD = 'pfarad',
	POWER_FEMTOFARAD = 'ffarad',
	POWER_HENRY = 'henry',
	POWER_MILLIHENRY = 'mhenry',
	POWER_MICROHENRY = 'µhenry',
	POWER_LUMENS = 'lumens',

	// Flow
	FLOW_GALLONS_PER_MINUTE = 'flowgpm',
	FLOW_CUBIC_METERS_PER_SECOND = 'flowcms',
	FLOW_CUBIC_FEET_PER_SECOND = 'flowcfs',
	FLOW_CUBIC_FEET_PER_MINUTE = 'flowcfm',
	FLOW_LITERS_PER_HOUR = 'litreh',
	FLOW_LITERS_PER_MINUTE = 'flowlpm',
	FLOW_MILLILITERS_PER_MINUTE = 'flowmlpm',
	FLOW_LUX = 'lux',

	// Force
	FORCE_NEWTON_METERS = 'forceNm',
	FORCE_KILONEWTON_METERS = 'forcekNm',
	FORCE_NEWTONS = 'forceN',
	FORCE_KILONEWTONS = 'forcekN',

	// Mass
	MASS_MILLIGRAM = 'massmg',
	MASS_GRAM = 'massg',
	MASS_POUND = 'masslb',
	MASS_KILOGRAM = 'masskg',
	MASS_METRIC_TON = 'masst',

	// Length
	LENGTH_MILLIMETER = 'lengthmm',
	LENGTH_INCH = 'lengthin',
	LENGTH_FOOT = 'lengthft',
	LENGTH_METER = 'lengthm',
	LENGTH_KILOMETER = 'lengthkm',
	LENGTH_MILE = 'lengthmi',

	// Pressure
	PRESSURE_MILLIBAR = 'pressurembar',
	PRESSURE_BAR = 'pressurebar',
	PRESSURE_KILOBAR = 'pressurekbar',
	PRESSURE_PASCAL = 'pressurepa',
	PRESSURE_HECTOPASCAL = 'pressurehpa',
	PRESSURE_KILOPASCAL = 'pressurekpa',
	PRESSURE_INCHES_HG = 'pressurehg',
	PRESSURE_PSI = 'pressurepsi',

	// Radiation
	RADIATION_BECQUEREL = 'radbq',
	RADIATION_CURIE = 'radci',
	RADIATION_GRAY = 'radgy',
	RADIATION_RAD = 'radrad',
	RADIATION_SIEVERT = 'radsv',
	RADIATION_MILLISIEVERT = 'radmsv',
	RADIATION_MICROSIEVERT = 'radusv',
	RADIATION_REM = 'radrem',
	RADIATION_EXPOSURE_C_PER_KG = 'radexpckg',
	RADIATION_ROENTGEN = 'radr',
	RADIATION_SIEVERT_PER_HOUR = 'radsvh',
	RADIATION_MILLISIEVERT_PER_HOUR = 'radmsvh',
	RADIATION_MICROSIEVERT_PER_HOUR = 'radusvh',

	// Rotation speed
	ROTATION_SPEED_REVOLUTIONS_PER_MINUTE = 'rotrpm',
	ROTATION_SPEED_HERTZ = 'rothz',
	ROTATION_SPEED_RADIANS_PER_SECOND = 'rotrads',
	ROTATION_SPEED_DEGREES_PER_SECOND = 'rotdegs',

	// Temperature
	TEMPERATURE_CELSIUS = 'celsius',
	TEMPERATURE_FAHRENHEIT = 'fahrenheit',
	TEMPERATURE_KELVIN = 'kelvin',

	// Velocity
	VELOCITY_METERS_PER_SECOND = 'velocityms',
	VELOCITY_KILOMETERS_PER_HOUR = 'velocitykmh',
	VELOCITY_MILES_PER_HOUR = 'velocitymph',
	VELOCITY_KNOT = 'velocityknot',

	// Volume
	VOLUME_MILLILITER = 'mlitre',
	VOLUME_LITER = 'litre',
	VOLUME_CUBIC_METER = 'm3',
	VOLUME_NORMAL_CUBIC_METER = 'Nm3',
	VOLUME_CUBIC_DECIMETER = 'dm3',
	VOLUME_GALLON = 'gallons',
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

	UCUM_EXBIBYTES = 'EiBy',
	OPEN_METRICS_EXBIBYTES = 'exbibytes',

	UCUM_ZEBIBYTES = 'ZiBy',
	OPEN_METRICS_ZEBIBYTES = 'zebibytes',

	UCUM_YOBIBYTES = 'YiBy',
	OPEN_METRICS_YOBIBYTES = 'yobibytes',

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

	UCUM_EXBIBYTES_SECOND = 'EiBy/s',
	OPEN_METRICS_EXBIBYTES_SECOND = 'exbibytes_per_second',

	UCUM_EXBIBITS_SECOND = 'Eibit/s',
	OPEN_METRICS_EXBIBITS_SECOND = 'exbibits_per_second',

	UCUM_ZEBIBYTES_SECOND = 'ZiBy/s',
	OPEN_METRICS_ZEBIBYTES_SECOND = 'zebibytes_per_second',

	UCUM_ZEBIBITS_SECOND = 'Zibit/s',
	OPEN_METRICS_ZEBIBITS_SECOND = 'zebibits_per_second',

	UCUM_YOBIBYTES_SECOND = 'YiBy/s',
	OPEN_METRICS_YOBIBYTES_SECOND = 'yobibytes_per_second',

	UCUM_YOBIBITS_SECOND = 'Yibit/s',
	OPEN_METRICS_YOBIBITS_SECOND = 'yobibits_per_second',

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

export interface ScaledValue {
	value: number;
	label: string;
}

export interface UnitFamilyConfig {
	units: UniversalYAxisUnit[];
	scaleFactor: number;
}

export interface YAxisCategory {
	name: string;
	units: {
		name: string;
		id: UniversalYAxisUnit;
	}[];
}

export enum YAxisSource {
	ALERTS = 'alerts',
	DASHBOARDS = 'dashboards',
	EXPLORER = 'explorer',
}
