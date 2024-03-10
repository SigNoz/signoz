package utils

// Map as in map-reduce.
// func SliceMap()
func SliceMap[S ~[]E, E any, O any](slice S, mapper func(E) O) []O {
	result := []O{}

	for _, item := range slice {
		mapped := mapper(item)
		result = append(result, mapped)
	}

	return result
}
