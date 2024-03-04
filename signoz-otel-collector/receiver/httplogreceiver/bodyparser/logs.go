package bodyparser

import "go.opentelemetry.io/collector/pdata/plog"

type Parser interface {
	Parse(body []byte) (plog.Logs, int, error)
}

func GetBodyParser(source string) Parser {
	switch source {
	// case "google":
	// 	return &GCloud{}
	case "json":
		return NewJsonBodyParser()
	case "heroku":
		return NewHerokuBodyParser()
	default:
		return &Default{}
	}
}
