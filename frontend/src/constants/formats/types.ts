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

export enum BooleanFormats {
	TRUE_FALSE = 'bool',
	YES_NO = 'bool_yes_no',
	ON_OFF = 'bool_on_off',
}

export type Format = {
	name: string;
	id: string;
};

export interface HelperFormat {
	name: string;
	id: string;
}

export interface HelperCategory {
	name: string;
	formats: Format[];
}
