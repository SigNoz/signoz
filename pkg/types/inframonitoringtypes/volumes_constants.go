package inframonitoringtypes

const (
	VolumesOrderByAvailable  = "available"
	VolumesOrderByCapacity   = "capacity"
	VolumesOrderByUsage      = "usage"
	VolumesOrderByInodes     = "inodes"
	VolumesOrderByInodesFree = "inodes_free"
	VolumesOrderByInodesUsed = "inodes_used"
)

var VolumesValidOrderByKeys = []string{
	VolumesOrderByAvailable,
	VolumesOrderByCapacity,
	VolumesOrderByUsage,
	VolumesOrderByInodes,
	VolumesOrderByInodesFree,
	VolumesOrderByInodesUsed,
}
