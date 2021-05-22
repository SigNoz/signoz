package druid

type DruidReader struct {
	DruidClientUrl string
}

func connect() string {
	return "Connected to Druid"
}

func NewSpanReader() *DruidReader {
	connect()
	return &DruidReader{
		DruidClientUrl: "http://localhost:8888",
	}
}

func (druidReader *DruidReader) GetServices() string {
	return "Hello from Druid"
}
