package cloudintegrationtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
)

var ErrCodeInvalidCloudRegion = errors.MustNewCode("invalid_cloud_region")

// List of all valid cloud regions on Amazon Web Services.
var ValidAWSRegions = map[string]struct{}{
	"af-south-1":     {}, // Africa (Cape Town).
	"ap-east-1":      {}, // Asia Pacific (Hong Kong).
	"ap-northeast-1": {}, // Asia Pacific (Tokyo).
	"ap-northeast-2": {}, // Asia Pacific (Seoul).
	"ap-northeast-3": {}, // Asia Pacific (Osaka).
	"ap-south-1":     {}, // Asia Pacific (Mumbai).
	"ap-south-2":     {}, // Asia Pacific (Hyderabad).
	"ap-southeast-1": {}, // Asia Pacific (Singapore).
	"ap-southeast-2": {}, // Asia Pacific (Sydney).
	"ap-southeast-3": {}, // Asia Pacific (Jakarta).
	"ap-southeast-4": {}, // Asia Pacific (Melbourne).
	"ca-central-1":   {}, // Canada (Central).
	"ca-west-1":      {}, // Canada West (Calgary).
	"eu-central-1":   {}, // Europe (Frankfurt).
	"eu-central-2":   {}, // Europe (Zurich).
	"eu-north-1":     {}, // Europe (Stockholm).
	"eu-south-1":     {}, // Europe (Milan).
	"eu-south-2":     {}, // Europe (Spain).
	"eu-west-1":      {}, // Europe (Ireland).
	"eu-west-2":      {}, // Europe (London).
	"eu-west-3":      {}, // Europe (Paris).
	"il-central-1":   {}, // Israel (Tel Aviv).
	"me-central-1":   {}, // Middle East (UAE).
	"me-south-1":     {}, // Middle East (Bahrain).
	"sa-east-1":      {}, // South America (Sao Paulo).
	"us-east-1":      {}, // US East (N. Virginia).
	"us-east-2":      {}, // US East (Ohio).
	"us-west-1":      {}, // US West (N. California).
	"us-west-2":      {}, // US West (Oregon).
}

// List of all valid cloud regions for Microsoft Azure.
var ValidAzureRegions = map[string]struct{}{
	"australiacentral":   {}, // Australia Central
	"australiacentral2":  {}, // Australia Central 2
	"australiaeast":      {}, // Australia East
	"australiasoutheast": {}, // Australia Southeast
	"austriaeast":        {}, // Austria East
	"belgiumcentral":     {}, // Belgium Central
	"brazilsouth":        {}, // Brazil South
	"brazilsoutheast":    {}, // Brazil Southeast
	"canadacentral":      {}, // Canada Central
	"canadaeast":         {}, // Canada East
	"centralindia":       {}, // Central India
	"centralus":          {}, // Central US
	"chilecentral":       {}, // Chile Central
	"denmarkeast":        {}, // Denmark East
	"eastasia":           {}, // East Asia
	"eastus":             {}, // East US
	"eastus2":            {}, // East US 2
	"francecentral":      {}, // France Central
	"francesouth":        {}, // France South
	"germanynorth":       {}, // Germany North
	"germanywestcentral": {}, // Germany West Central
	"indonesiacentral":   {}, // Indonesia Central
	"israelcentral":      {}, // Israel Central
	"italynorth":         {}, // Italy North
	"japaneast":          {}, // Japan East
	"japanwest":          {}, // Japan West
	"koreacentral":       {}, // Korea Central
	"koreasouth":         {}, // Korea South
	"malaysiawest":       {}, // Malaysia West
	"mexicocentral":      {}, // Mexico Central
	"newzealandnorth":    {}, // New Zealand North
	"northcentralus":     {}, // North Central US
	"northeurope":        {}, // North Europe
	"norwayeast":         {}, // Norway East
	"norwaywest":         {}, // Norway West
	"polandcentral":      {}, // Poland Central
	"qatarcentral":       {}, // Qatar Central
	"southafricanorth":   {}, // South Africa North
	"southafricawest":    {}, // South Africa West
	"southcentralus":     {}, // South Central US
	"southindia":         {}, // South India
	"southeastasia":      {}, // Southeast Asia
	"spaincentral":       {}, // Spain Central
	"swedencentral":      {}, // Sweden Central
	"switzerlandnorth":   {}, // Switzerland North
	"switzerlandwest":    {}, // Switzerland West
	"uaecentral":         {}, // UAE Central
	"uaenorth":           {}, // UAE North
	"uksouth":            {}, // UK South
	"ukwest":             {}, // UK West
	"westcentralus":      {}, // West Central US
	"westeurope":         {}, // West Europe
	"westindia":          {}, // West India
	"westus":             {}, // West US
	"westus2":            {}, // West US 2
	"westus3":            {}, // West US 3
}

func validateAWSRegion(region string) error {
	_, ok := ValidAWSRegions[region]
	if !ok {
		return errors.NewInvalidInputf(ErrCodeInvalidCloudRegion, "invalid AWS region: %s", region)
	}
	return nil
}
