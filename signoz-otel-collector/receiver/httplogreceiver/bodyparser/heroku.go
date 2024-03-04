package bodyparser

import (
	"regexp"
	"strconv"
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
)

type Heroku struct {
	parser *regexp.Regexp
	names  []string
}

func NewHerokuBodyParser() *Heroku {
	regex, err := regexp.Compile(`^<(?P<priority>\d|\d{2}|1[1-8]\d|19[01])>(?P<version>\d{1,2})\s(?P<timestamp>-|[^\s]+)\s(?P<hostname>[\S]{1,255})\s(?P<appname>[\S]{1,48})\s(?P<procid>[\S]{1,128})\s(?P<msgid>[\S]{1,32})(?:\s(?P<msg>.+))?$`)
	if err != nil {
		panic(err)
	}

	names := regex.SubexpNames()

	return &Heroku{
		parser: regex,
		names:  names,
	}
}

type resourceAttrs struct {
	priority string
	version  string
	hostname string
	appname  string
	procid   string
}
type log struct {
	timestamp string
	msgid     string
	body      string
}

func (l *Heroku) Parse(body []byte) (plog.Logs, int, error) {
	data := string(body)

	loglines := octetCountingSplitter(data)

	results := map[resourceAttrs][]log{}
	for _, line := range loglines {
		parsedLog := l.parser.FindStringSubmatch(line)

		if len(parsedLog) != len(l.names) {
			//TODO: do something here to convey that it wasn't parsed (unlikely to happen)
			results[resourceAttrs{}] = append(results[resourceAttrs{}], log{
				body: line,
			})
		} else {
			d := resourceAttrs{
				priority: parsedLog[1],
				version:  parsedLog[2],
				hostname: parsedLog[4],
				appname:  parsedLog[5],
				procid:   parsedLog[6],
			}

			results[d] = append(results[d], log{
				// for timestamp as of now not parsing and leaving it to the user if they want to map it to actual timestamp
				// can change it later if required
				timestamp: parsedLog[3],
				msgid:     parsedLog[7],
				body:      parsedLog[8],
			})
		}
	}

	ld := plog.NewLogs()
	for resource, logbodies := range results {
		rl := ld.ResourceLogs().AppendEmpty()
		if resource != (resourceAttrs{}) {
			rl.Resource().Attributes().EnsureCapacity(5)
			rl.Resource().Attributes().PutStr("priority", resource.priority)
			rl.Resource().Attributes().PutStr("version", resource.version)
			rl.Resource().Attributes().PutStr("hostname", resource.hostname)
			rl.Resource().Attributes().PutStr("appname", resource.appname)
			rl.Resource().Attributes().PutStr("procid", resource.procid)
		}

		sl := rl.ScopeLogs().AppendEmpty()
		for _, log := range logbodies {
			rec := sl.LogRecords().AppendEmpty()
			rec.Body().SetStr(log.body)
			rec.SetObservedTimestamp(pcommon.NewTimestampFromTime(time.Now().UTC()))

			if log.timestamp != "" {
				rec.Attributes().EnsureCapacity(2)
				rec.Attributes().PutStr("timestamp", log.timestamp)
				rec.Attributes().PutStr("msgid", log.msgid)
			}
		}
	}
	return ld, len(loglines), nil

}

func octetCountingSplitter(data string) []string {
	strings := []string{}

	index := 0
	length := len(data)
	for {
		lengthStr := ""

		// ignore tabs and spaces
		for {
			if index >= length || (data[index] != ' ' && data[index] != '\t' && data[index] != '\n') {
				break
			}
			index++
		}

		if index >= length {
			break
		}

		for i := index; i < length; i++ {
			if data[i] == ' ' {
				break
			}
			index++
			lengthStr += string(data[i])
		}

		length, _ := strconv.Atoi(lengthStr)
		end := index + length
		strings = append(strings, data[index+1:end])
		index = end
	}
	return strings
}
