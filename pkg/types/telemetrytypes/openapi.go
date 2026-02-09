package telemetrytypes

// Enum returns the acceptable values for Signal.
func (Signal) Enum() []any {
	return []any{
		SignalTraces,
		SignalLogs,
		SignalMetrics,
	}
}

// Enum returns the acceptable values for FieldContext.
func (FieldContext) Enum() []any {
	return []any{
		FieldContextMetric,
		FieldContextLog,
		FieldContextSpan,
		// FieldContextTrace,
		FieldContextResource,
		// FieldContextScope,
		FieldContextAttribute,
		// FieldContextEvent,
		FieldContextBody,
	}
}

// Enum returns the acceptable values for Source.
func (Source) Enum() []any {
	return []any{
		SourceMeter,
	}
}

// Enum returns the acceptable values for FieldDataType.
func (FieldDataType) Enum() []any {
	return []any{
		FieldDataTypeString,
		FieldDataTypeBool,
		FieldDataTypeFloat64,
		FieldDataTypeInt64,
		FieldDataTypeNumber,
		// FieldDataTypeArrayString,
		// FieldDataTypeArrayFloat64,
		// FieldDataTypeArrayBool,
		// FieldDataTypeArrayInt64,
		// FieldDataTypeArrayNumber,
	}
}
