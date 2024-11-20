package utils

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

const HOUR_NANO = int64(3600000000000)

type LogsListTsRange struct {
	Start int64
	End   int64
}

func GetListTsRanges(start, end int64) []LogsListTsRange {
	startNano := GetEpochNanoSecs(start)
	endNano := GetEpochNanoSecs(end)
	result := []LogsListTsRange{}

	if endNano-startNano > HOUR_NANO {
		bucket := HOUR_NANO
		tStartNano := endNano - bucket

		complete := false
		for {
			result = append(result, LogsListTsRange{Start: tStartNano, End: endNano})
			if complete {
				break
			}

			bucket = bucket * 2
			endNano = tStartNano
			tStartNano = tStartNano - bucket

			// break condition
			if tStartNano <= startNano {
				complete = true
				tStartNano = startNano
			}
		}
	} else {
		result = append(result, LogsListTsRange{Start: start, End: end})
	}
	return result
}

// This tries to see all possible fields that it can fall back to if some meta is missing
// check Test_GenerateEnrichmentKeys for example
func GenerateEnrichmentKeys(field v3.AttributeKey) []string {
	names := []string{}
	if field.Type != v3.AttributeKeyTypeUnspecified && field.DataType != v3.AttributeKeyDataTypeUnspecified {
		names = append(names, field.Key+"##"+field.Type.String()+"##"+field.DataType.String())
		return names
	}

	types := []v3.AttributeKeyType{}
	dTypes := []v3.AttributeKeyDataType{}
	if field.Type != v3.AttributeKeyTypeUnspecified {
		types = append(types, field.Type)
	} else {
		types = append(types, v3.AttributeKeyTypeTag, v3.AttributeKeyTypeResource)
	}
	if field.DataType != v3.AttributeKeyDataTypeUnspecified {
		dTypes = append(dTypes, field.DataType)
	} else {
		dTypes = append(dTypes, v3.AttributeKeyDataTypeFloat64, v3.AttributeKeyDataTypeInt64, v3.AttributeKeyDataTypeString, v3.AttributeKeyDataTypeBool)
	}

	for _, t := range types {
		for _, d := range dTypes {
			names = append(names, field.Key+"##"+t.String()+"##"+d.String())
		}
	}

	return names
}
