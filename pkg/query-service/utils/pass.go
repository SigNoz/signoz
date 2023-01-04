package utils

import (
	"github.com/sethvargo/go-password/password"
)

func GeneratePassowrd() string {
	res, _ := password.Generate(64, 10, 10, false, false)
	return res
}
