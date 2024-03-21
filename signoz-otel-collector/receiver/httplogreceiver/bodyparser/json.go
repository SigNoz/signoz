package bodyparser

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
)

type JSON struct {
}

type JSONLog struct {
	Timestamp      int64                  `json:"timestamp"`
	TraceID        string                 `json:"trace_id"`
	SpanID         string                 `json:"span_id"`
	TraceFlags     int                    `json:"trace_flags"`
	SeverityText   string                 `json:"severity_text"`
	SeverityNumber int                    `json:"severity_number"`
	Attributes     map[string]interface{} `json:"attributes"`
	Resources      map[string]interface{} `json:"resources"`
	Body           string                 `json:"body"`
}

func NewJsonBodyParser() *JSON {
	return &JSON{}
}

func (l *JSON) Parse(body []byte) (plog.Logs, int, error) {

	data := []map[string]interface{}{}
	err := json.Unmarshal(body, &data)
	if err != nil {
		return plog.NewLogs(), 0, fmt.Errorf("error unmarshalling data:%w", err)
	}

	jsonLogArray := []JSONLog{}
	for _, log := range data {
		jsonLog := JSONLog{}
		for key, val := range log {
			switch key {
			case "timestamp":
				// nanosecond epoch
				data, ok := val.(float64)
				if !ok {
					return plog.NewLogs(), 0, fmt.Errorf("timestamp must be a uint64 nanoseconds since Unix epoch")
				}
				jsonLog.Timestamp = getEpochNano(int64(data))
			case "trace_id":
				data, ok := val.(string)
				if !ok {
					return plog.NewLogs(), 0, fmt.Errorf("trace_id must be a hex string")
				}
				jsonLog.TraceID = data
			case "span_id":
				data, ok := val.(string)
				if !ok {
					return plog.NewLogs(), 0, fmt.Errorf("span_id must be a hex string")
				}
				jsonLog.SpanID = data
			case "trace_flags":
				data, ok := val.(float64)
				if !ok {
					return plog.NewLogs(), 0, fmt.Errorf("trace_flags must be a number")
				}
				jsonLog.TraceFlags = int(data)
			case "severity_text":
				data, ok := val.(string)
				if !ok {
					return plog.NewLogs(), 0, fmt.Errorf("severity_text must be a string")
				}
				jsonLog.SeverityText = data
			case "severity_number":
				data, ok := val.(float64)
				if !ok {
					return plog.NewLogs(), 0, fmt.Errorf("severity_number must be a number")
				}
				jsonLog.SeverityNumber = int(data)
			case "attributes":
				data, ok := val.(map[string]interface{})
				if !ok {
					return plog.NewLogs(), 0, fmt.Errorf("attributes must be a map")
				}
				jsonLog.Attributes = data
			case "resources":
				data, ok := val.(map[string]interface{})
				if !ok {
					return plog.NewLogs(), 0, fmt.Errorf("resources must be a map")
				}
				jsonLog.Resources = data
			case "message", "body":
				data, ok := val.(string)
				if !ok {
					return plog.NewLogs(), 0, fmt.Errorf("%s must be a string", key)
				}
				jsonLog.Body = data
			default:
				// if there is any other key present convert it to an attribute
				if jsonLog.Attributes == nil {
					jsonLog.Attributes = map[string]interface{}{}
				}
				jsonLog.Attributes[key] = val
			}
		}
		jsonLogArray = append(jsonLogArray, jsonLog)
	}

	ld := plog.NewLogs()
	for _, log := range jsonLogArray {
		rl := ld.ResourceLogs().AppendEmpty()
		rAttrLen := len(log.Resources)
		rl.Resource().Attributes().EnsureCapacity(rAttrLen)
		for k, v := range log.Resources {
			l.AddAttribute(rl.Resource().Attributes(), k, v)
		}
		sl := rl.ScopeLogs().AppendEmpty()
		rec := sl.LogRecords().AppendEmpty()
		attrLen := len(log.Attributes)
		rec.Attributes().EnsureCapacity(attrLen)
		for k, v := range log.Attributes {
			l.AddAttribute(rec.Attributes(), k, v)
		}
		rec.Body().SetStr(log.Body)
		if log.TraceID != "" {
			traceIdByte, err := hex.DecodeString(log.TraceID)
			if err != nil {
				return plog.Logs{}, 0, fmt.Errorf("error decoding trace_id:%w", err)
			}
			var traceID [16]byte
			copy(traceID[:], traceIdByte)
			rec.SetTraceID(pcommon.TraceID(pcommon.TraceID(traceID)))
		}
		if log.SpanID != "" {
			spanIdByte, err := hex.DecodeString(log.SpanID)
			if err != nil {
				return plog.Logs{}, 0, fmt.Errorf("error decoding span_id:%w", err)
			}
			var spanID [8]byte
			copy(spanID[:], spanIdByte)
			rec.SetSpanID(pcommon.SpanID(spanID))
		}
		rec.SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(0, log.Timestamp)))
		rec.SetObservedTimestamp(pcommon.NewTimestampFromTime(time.Now().UTC()))
		rec.SetSeverityText(log.SeverityText)
		rec.SetSeverityNumber(plog.SeverityNumber(log.SeverityNumber))
		rec.SetFlags(plog.LogRecordFlags(log.TraceFlags))
	}
	return ld, len(data), nil
}

func (l *JSON) AddAttribute(attrs pcommon.Map, key string, value interface{}) {
	switch value.(type) {
	case string:
		attrs.PutStr(key, value.(string))
	case int, int8, int16, int32, int64:
		attrs.PutInt(key, value.(int64))
	case uint, uint8, uint16, uint32, uint64:
		attrs.PutInt(key, int64(value.(uint64)))
	case float32, float64:
		attrs.PutDouble(key, value.(float64))
	case bool:
		attrs.PutBool(key, value.(bool))
	default:
		// ignoring the error for now
		bytes, _ := json.Marshal(value)
		attrs.PutStr(key, string(bytes))
	}

}

// getEpochNano returns epoch in  nanoseconds
func getEpochNano(epoch int64) int64 {
	epochCopy := epoch
	count := 0
	if epoch == 0 {
		count = 1
	} else {
		for epoch != 0 {
			epoch /= 10
			count++
		}
	}
	return epochCopy * int64(math.Pow(10, float64(19-count)))
}
