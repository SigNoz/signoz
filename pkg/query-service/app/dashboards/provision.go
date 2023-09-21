package dashboards

import (
	"encoding/json"
	"io/ioutil"
	"os"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func readCurrentDir(dir string, fm interfaces.FeatureLookup) error {
	file, err := os.Open(dir)
	if err != nil {
		zap.S().Errorf("failed opening directory: %s", err)
		return err
	}
	defer file.Close()

	list, _ := file.Readdirnames(0) // 0 to read all files and folders
	for _, filename := range list {
		zap.S().Info("Provisioning dashboard: ", filename)
		plan, err := ioutil.ReadFile(dir + "/" + filename)
		if err != nil {
			zap.S().Errorf("Creating Dashboards: Error in reading json fron file: %s\t%s", filename, err)
			continue
		}
		var data map[string]interface{}
		err = json.Unmarshal(plan, &data)
		if err != nil {
			zap.S().Errorf("Creating Dashboards: Error in unmarshalling json from file: %s\t%s", filename, err)
			continue
		}
		err = IsPostDataSane(&data)
		if err != nil {
			zap.S().Infof("Creating Dashboards: Error in file: %s\t%s", filename, err)
			continue
		}

		id := data["uuid"]
		if id == nil {
			_, apiErr := CreateDashboard(data, fm)
			if apiErr != nil {
				zap.S().Errorf("Creating Dashboards: Error in file: %s\t%s", filename, apiErr.Err)
			}
			continue
		}

		apiErr := upsertDashboard(id.(string), data, filename, fm)
		if apiErr != nil {
			zap.S().Errorf("Creating Dashboards: Error upserting dashboard: %s\t%s", filename, apiErr.Err)
		}
	}
	return nil
}

func upsertDashboard(uuid string, data map[string]interface{}, filename string, fm interfaces.FeatureLookup) *model.ApiError {
	_, apiErr := GetDashboard(uuid)
	if apiErr == nil {
		zap.S().Infof("Creating Dashboards: Already exists: %s\t%s", filename, "Dashboard already present in database, Updating dashboard")
		_, apiErr := UpdateDashboard(uuid, data, fm)
		return apiErr
	}

	zap.S().Infof("Creating Dashboards: UUID not found: %s\t%s", filename, "Dashboard not present in database, Creating dashboard")
	_, apiErr = CreateDashboard(data, fm)
	return apiErr
}

func LoadDashboardFiles(fm interfaces.FeatureLookup) error {
	dashboardsPath := constants.GetOrDefaultEnv("DASHBOARDS_PATH", "./config/dashboards")
	return readCurrentDir(dashboardsPath, fm)
}
