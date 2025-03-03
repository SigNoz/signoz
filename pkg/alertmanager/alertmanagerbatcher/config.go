package alertmanagerbatcher

type Config struct {
	Capacity int
	Size     int
}

func NewConfig() Config {
	return Config{
		Capacity: 1000,
		Size:     64,
	}
}
