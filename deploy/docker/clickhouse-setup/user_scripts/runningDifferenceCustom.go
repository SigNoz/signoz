package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// NOTE: executable must be built with target OS and architecture set to linux/amd64
// env GOOS=linux GOARCH=arm64 go build -o runningDifferenceCustom runningDifferenceCustom.go

/*
	- select runningDifference(value) from (select value from signoz_metrics.samples limit X);
	- select runningDifferenceCustom(groupArray(value)) from (select value from signoz_metrics.samples limit X);

    Number of values | runningDiff | runningDiffCustom
	- 10             | ~ 0.01      | ~ 0.03
	- 50             | ~ 0.01      | ~ 0.03-0.035
	- 100            | ~ 0.02      | ~ 0.03-0.05
	- 200            | ~ 0.025     | ~ 0.04
 	- 500            | ~ 0.025-.03 | ~ 0.04
	- 1000           | ~ 0.033     | ~ 0.05
	- 2000           | ~ 0.04      | ~ 0.05
	- 5000           | ~ 0.05      | ~ 0.07
	- 10000          | ~ 0.065     | ~ 0.07
*/

func main() {
	reader := bufio.NewReader(os.Stdin)
	text, _ := reader.ReadString('\n')
	var numbers []float64
	text = text[2 : len(text)-3]
	for _, num := range strings.Split(text, ",") {
		num = strings.TrimSpace(num)
		number, err := strconv.ParseFloat(num, 64)
		if err == nil {
			numbers = append(numbers, number)
		}
	}
	var prev float64
	var diffArray []float64
	for _, num := range numbers {
		diff := num - prev
		if prev > num {
			diff += prev
		}
		diffArray = append(diffArray, diff)
		prev = num
	}
	fmt.Print("\"[")
	for idx, num := range diffArray {
		fmt.Print(num)
		if idx < len(diffArray)-1 {
			fmt.Print(",")
		}
	}
	fmt.Print("]\"")
}
