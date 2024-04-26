package utils

// Map as in map-reduce.
func MapSlice[Slice ~[]Elem, Elem any, Output any](
	slice Slice, mapper func(Elem) Output,
) []Output {
	result := []Output{}

	for _, item := range slice {
		mapped := mapper(item)
		result = append(result, mapped)
	}

	return result
}

func FilterSlice[Slice ~[]Elem, Elem any](
	slice Slice, filterFn func(Elem) bool,
) Slice {
	result := Slice{}

	for _, item := range slice {
		if filterFn(item) {
			result = append(result, item)
		}
	}

	return result
}
