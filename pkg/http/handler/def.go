package handler

type Def struct {
	Tags              []string
	Summary           string
	Description       string
	Request           any
	Response          any
	SuccessStatusCode int
	ErrorStatusCodes  []int
}
