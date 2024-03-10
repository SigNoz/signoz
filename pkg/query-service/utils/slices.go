package utils

// Map as in map-reduce.
// func SliceMap()
func MapSlice[S ~[]E, E any, O any](slice S, mapper func(E) O) []O {
	result := []O{}

	for _, item := range slice {
		mapped := mapper(item)
		result = append(result, mapped)
	}

	return result
}

func FilterSlice[S ~[]E, E any](slice S, filterFn func(E) bool) S {
	result := S{}

	for _, item := range slice {
		if filterFn(item) {
			result = append(result, item)
		}
	}

	return result
}
