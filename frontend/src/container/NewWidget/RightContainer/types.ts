export enum CategoryNames {
	Time = 'Time',
	Throughput = 'Throughput',
	Data = 'Data',
	DataRate = 'DataRate',
	HashRate = 'HashRate',
	Miscellaneous = 'Miscellaneous',
	Acceleration = 'Acceleration',
	Angular = 'Angular',
	Area = 'Area',
	Flops = 'Flops',
	Concentration = 'Concentration',
	Currency = 'Currency',
	Datetime = 'Datetime',
	PowerElectrical = 'PowerElectrical',
	Flow = 'Flow',
	Force = 'Force',
	Mass = 'Mass',
	Length = 'Length',
	Pressure = 'Pressure',
	Radiation = 'Radiation',
	RotationSpeed = 'RotationSpeed',
	Temperature = 'Temperature',
	Velocity = 'Velocity',
	Volume = 'Volume',
	Boolean = 'Boolean',
	Angle = 'Angle',
	Computation = 'Computation',
	Energy = 'Energy',
}

export enum TimeFormats {
	Hertz = 'hertz',
	Nanoseconds = 'ns',
	Microseconds = 'µs',
	Milliseconds = 'ms',
	Seconds = 's',
	Minutes = 'm',
	Hours = 'h',
	Days = 'd',
	DurationMs = 'dtdurationms',
	DurationS = 'dtdurations',
	DurationHms = 'dthms',
	DurationDhms = 'dtdhms',
	Timeticks = 'timeticks',
	ClockMs = 'clockms',
	ClockS = 'clocks',
}

export enum ThroughputFormats {
	CountsPerSec = 'cps',
	OpsPerSec = 'ops',
	RequestsPerSec = 'reqps',
	ReadsPerSec = 'rps',
	WritesPerSec = 'wps',
	IOOpsPerSec = 'iops',
	CountsPerMin = 'cpm',
	OpsPerMin = 'opm',
	ReadsPerMin = 'rpm',
	WritesPerMin = 'wpm',
}

export enum DataFormats {
	BytesIEC = 'bytes',
	BytesSI = 'decbytes',
	BitsIEC = 'bits',
	BitsSI = 'decbits',
	KibiBytes = 'kbytes',
	KiloBytes = 'deckbytes',
	MebiBytes = 'mbytes',
	MegaBytes = 'decmbytes',
	GibiBytes = 'gbytes',
	GigaBytes = 'decgbytes',
	TebiBytes = 'tbytes',
	TeraBytes = 'dectbytes',
	PebiBytes = 'pbytes',
	PetaBytes = 'decpbytes',
}

export enum DataRateFormats {
	PacketsPerSec = 'pps',
	BytesPerSecIEC = 'binBps',
	BytesPerSecSI = 'Bps',
	BitsPerSecIEC = 'binbps',
	BitsPerSecSI = 'bps',
	KibiBytesPerSec = 'KiBs',
	KibiBitsPerSec = 'Kibits',
	KiloBytesPerSec = 'KBs',
	KiloBitsPerSec = 'Kbits',
	MebiBytesPerSec = 'MiBs',
	MebiBitsPerSec = 'Mibits',
	MegaBytesPerSec = 'MBs',
	MegaBitsPerSec = 'Mbits',
	GibiBytesPerSec = 'GiBs',
	GibiBitsPerSec = 'Gibits',
	GigaBytesPerSec = 'GBs',
	GigaBitsPerSec = 'Gbits',
	TebiBytesPerSec = 'TiBs',
	TebiBitsPerSec = 'Tibits',
	TeraBytesPerSec = 'TBs',
	TeraBitsPerSec = 'Tbits',
	PebiBytesPerSec = 'PiBs',
	PebiBitsPerSec = 'Pibits',
	PetaBytesPerSec = 'PBs',
	PetaBitsPerSec = 'Pbits',
}

export enum HashRateFormats {
	HashesPerSec = 'Hs',
	KiloHashesPerSec = 'KHs',
	MegaHashesPerSec = 'MHs',
	GigaHashesPerSec = 'GHs',
	TeraHashesPerSec = 'THs',
	PetaHashesPerSec = 'PHs',
	ExaHashesPerSec = 'EHs',
}

export enum MiscellaneousFormats {
	None = 'none',
	String = 'string',
	Short = 'short',
	Percent = 'percent',
	PercentUnit = 'percentunit',
	Humidity = 'humidity',
	Decibel = 'dB',
	Hexadecimal0x = 'hex0x',
	Hexadecimal = 'hex',
	ScientificNotation = 'sci',
	LocaleFormat = 'locale',
	Pixels = 'pixel',
}

export enum AccelerationFormats {
	MetersPerSecondSquared = 'accMS2',
	FeetPerSecondSquared = 'accFS2',
	GUnit = 'accG',
}

export enum AngularFormats {
	Degree = 'degree',
	Radian = 'radian',
	Gradian = 'grad',
	ArcMinute = 'arcmin',
	ArcSecond = 'arcsec',
}

export enum AreaFormats {
	SquareMeters = 'areaM2',
	SquareFeet = 'areaF2',
	SquareMiles = 'areaMI2',
}

export enum FlopsFormats {
	FLOPs = 'flops',
	MFLOPs = 'mflops',
	GFLOPs = 'gflops',
	TFLOPs = 'tflops',
	PFLOPs = 'pflops',
	EFLOPs = 'eflops',
	ZFLOPs = 'zflops',
	YFLOPs = 'yflops',
}

export enum ConcentrationFormats {
	PPM = 'ppm',
	PPB = 'conppb',
	NgM3 = 'conngm3',
	NgNM3 = 'conngNm3',
	UgM3 = 'conμgm3',
	UgNM3 = 'conμgNm3',
	MgM3 = 'conmgm3',
	MgNM3 = 'conmgNm3',
	GM3 = 'congm3',
	GNM3 = 'congNm3',
	MgDL = 'conmgdL',
	MmolL = 'conmmolL',
}

export enum CurrencyFormats {
	USD = 'currencyUSD',
	GBP = 'currencyGBP',
	EUR = 'currencyEUR',
	JPY = 'currencyJPY',
	RUB = 'currencyRUB',
	UAH = 'currencyUAH',
	BRL = 'currencyBRL',
	DKK = 'currencyDKK',
	ISK = 'currencyISK',
	NOK = 'currencyNOK',
	SEK = 'currencySEK',
	CZK = 'currencyCZK',
	CHF = 'currencyCHF',
	PLN = 'currencyPLN',
	BTC = 'currencyBTC',
	MBTC = 'currencymBTC',
	UBTC = 'currencyμBTC',
	ZAR = 'currencyZAR',
	INR = 'currencyINR',
	KRW = 'currencyKRW',
	IDR = 'currencyIDR',
	PHP = 'currencyPHP',
	VND = 'currencyVND',
}

export enum DatetimeFormats {
	ISO = 'dateTimeAsIso',
	ISONoDateIfToday = 'dateTimeAsIsoNoDateIfToday',
	US = 'dateTimeAsUS',
	USNoDateIfToday = 'dateTimeAsUSNoDateIfToday',
	Local = 'dateTimeAsLocal',
	LocalNoDateIfToday = 'dateTimeAsLocalNoDateIfToday',
	System = 'dateTimeAsSystem',
	FromNow = 'dateTimeFromNow',
}

export enum PowerElectricalFormats {
	WATT = 'watt',
	KWATT = 'kwatt',
	MEGWATT = 'megwatt',
	GWATT = 'gwatt',
	MWATT = 'mwatt',
	WM2 = 'Wm2',
	VOLTAMP = 'voltamp',
	KVOLTAMP = 'kvoltamp',
	VOLTAMPREACT = 'voltampreact',
	KVOLTAMPREACT = 'kvoltampreact',
	WATTH = 'watth',
	WATTHPERKG = 'watthperkg',
	KWATTH = 'kwatth',
	KWATTM = 'kwattm',
	AMPH = 'amph',
	KAMPH = 'kamph',
	MAMPH = 'mamph',
	JOULE = 'joule',
	EV = 'ev',
	AMP = 'amp',
	KAMP = 'kamp',
	MAMP = 'mamp',
	VOLT = 'volt',
	KVOLT = 'kvolt',
	MVOLT = 'mvolt',
	DBM = 'dBm',
	OHM = 'ohm',
	KOHM = 'kohm',
	MOHM = 'Mohm',
	FARAD = 'farad',
	µFARAD = 'µfarad',
	NFARAD = 'nfarad',
	PFARAD = 'pfarad',
	FFARAD = 'ffarad',
	HENRY = 'henry',
	MHENRY = 'mhenry',
	µHENRY = 'µhenry',
	LUMENS = 'lumens',
}

export enum FlowFormats {
	FLOWGPM = 'flowgpm',
	FLOWCMS = 'flowcms',
	FLOWCFS = 'flowcfs',
	FLOWCFM = 'flowcfm',
	LITREH = 'litreh',
	FLOWLPM = 'flowlpm',
	FLOWMLPM = 'flowmlpm',
	LUX = 'lux',
}

export enum ForceFormats {
	FORCENM = 'forceNm',
	FORCEKNM = 'forcekNm',
	FORCEN = 'forceN',
	FORCEKN = 'forcekN',
}

export enum MassFormats {
	MASSMG = 'massmg',
	MASSG = 'massg',
	MASSLB = 'masslb',
	MASSKG = 'masskg',
	MASST = 'masst',
}

export enum LengthFormats {
	LENGTHMM = 'lengthmm',
	LENGTHIN = 'lengthin',
	LENGTHFT = 'lengthft',
	LENGTHM = 'lengthm',
	LENGTHKM = 'lengthkm',
	LENGTHMI = 'lengthmi',
}

export enum PressureFormats {
	PRESSUREMBAR = 'pressurembar',
	PRESSUREBAR = 'pressurebar',
	PRESSUREKBAR = 'pressurekbar',
	PRESSUREPA = 'pressurepa',
	PRESSUREHPA = 'pressurehpa',
	PRESSUREKPA = 'pressurekpa',
	PRESSUREHG = 'pressurehg',
	PRESSUREPSI = 'pressurepsi',
}

export enum RadiationFormats {
	RADBQ = 'radbq',
	RADCI = 'radci',
	RADGY = 'radgy',
	RADRAD = 'radrad',
	RADSV = 'radsv',
	RADMSV = 'radmsv',
	RADUSV = 'radusv',
	RADREM = 'radrem',
	RADEXPCKG = 'radexpckg',
	RADR = 'radr',
	RADSVH = 'radsvh',
	RADMSVH = 'radmsvh',
	RADUSVH = 'radusvh',
}

export enum RotationSpeedFormats {
	ROTRPM = 'rotrpm',
	ROTHZ = 'rothz',
	ROTRADS = 'rotrads',
	ROTDEGS = 'rotdegs',
}

export enum TemperatureFormats {
	CELSIUS = 'celsius',
	FAHRENHEIT = 'fahrenheit',
	KELVIN = 'kelvin',
}

export enum VelocityFormats {
	METERS_PER_SECOND = 'velocityms',
	KILOMETERS_PER_HOUR = 'velocitykmh',
	MILES_PER_HOUR = 'velocitymph',
	KNOT = 'velocityknot',
}

export enum VolumeFormats {
	MILLILITRE = 'mlitre',
	LITRE = 'litre',
	CUBIC_METER = 'm3',
	NORMAL_CUBIC_METER = 'Nm3',
	CUBIC_DECIMETER = 'dm3',
	GALLONS = 'gallons',
}

export enum BooleanFormats {
	TRUE_FALSE = 'bool',
	YES_NO = 'bool_yes_no',
	ON_OFF = 'bool_on_off',
}

export type Format = {
	name: string;
	id: string;
};

export type Category = {
	name: string;
	formats: Format[];
};

export type DataTypeCategories = Category[];

export interface HelperFormat {
	name: string;
	id: string;
}

export interface HelperCategory {
	name: string;
	formats: Format[];
}
