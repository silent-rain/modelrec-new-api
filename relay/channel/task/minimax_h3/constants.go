package minimax_h3

// MiniMax-H3 视频生成 V2 API 常量。
// 参考: https://platform.minimaxi.com/docs/llms.txt
//      model-hub-rs/crates/sdk/minimax/src/docs/视频/MiniMax-H3

const (
	ChannelName = "minimax-h3"
)

var ModelList = []string{
	"MiniMax-H3",
}

const (
	// CreateVideoEndpoint 创建视频生成任务 V2 接口
	CreateVideoEndpoint = "/v2/video_generation"
	// QueryTaskEndpoint 查询任务接口（task_id 为路径参数）
	QueryTaskEndpoint = "/v2/query/video_generation/%s"
)

// 上游任务状态（V2 接口 status 字段取值）
const (
	StatusQueued    = "queued"
	StatusRunning   = "running"
	StatusSucceeded = "succeeded"
	StatusFailed    = "failed"
	StatusCancelled = "cancelled"
)

// 任务类型（task_type 字段）
const (
	TaskTypeGeneration = "generation"
)

// 分辨率
const (
	Resolution768P = "768P"
	Resolution2K   = "2K"
)

// 宽高比
const (
	RatioAdaptive = "adaptive"
	Ratio21x9     = "21:9"
	Ratio16x9     = "16:9"
	Ratio4x3      = "4:3"
	Ratio1x1      = "1:1"
	Ratio3x4      = "3:4"
	Ratio9x16     = "9:16"
)

// content item type
const (
	ContentTypeText     = "text"
	ContentTypeImageURL = "image_url"
)

// content item role
const (
	RoleFirstFrame = "first_frame"
)

const (
	// DefaultDuration 默认生成时长（秒）
	DefaultDuration = 5
	// DefaultResolution 默认分辨率
	DefaultResolution = Resolution2K
	// MinDuration 支持的最小时长（秒）
	MinDuration = 4
	// MaxDuration 支持的最大时长（秒）
	MaxDuration = 15
)
