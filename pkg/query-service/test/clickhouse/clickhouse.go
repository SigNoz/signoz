package clickhouse

type ClickHouseReader struct {
	ClickHouseClientUrl string
}

func connect() string {
	return "Connected to ClickHouse"
}

func NewSpanReader() *ClickHouseReader {
	connect()
	return &ClickHouseReader{
		ClickHouseClientUrl: "http://localhost:9000",
	}
}

func (chReader *ClickHouseReader) GetServices() string {
	return "Hello from ClickHouse"
}
