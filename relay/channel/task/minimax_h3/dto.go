package minimax_h3

// MiniMax-H3 视频生成 V2 API 的请求/响应数据结构。
// 参考: model-hub-rs/crates/sdk/minimax/src/docs/视频/MiniMax-H3/创建视频生成任务.md
//       model-hub-rs/crates/sdk/minimax/src/docs/视频/MiniMax-H3/查询任务.md

// ImageURL 图片对象（image_url content item 的 value）
type ImageURL struct {
	URL string `json:"url"`
}

// ContentItem 多模态输入内容数组的单个元素。
// 类型通过 type 区分（text / image_url / video_url / audio_url），
// 可选字段使用指针/omitempty 以便上游省略未提供的字段。
type ContentItem struct {
	Type     string    `json:"type"`
	Text     string    `json:"text,omitempty"`
	ImageURL *ImageURL `json:"image_url,omitempty"`
	Role     string    `json:"role,omitempty"`
}

// VideoGenerationV2Req 创建视频生成任务 V2 请求体。
// 必填: model / content / resolution / duration。
// 文生视频: content 仅含一个 text 项；图生视频: content 含 text + image_url(first_frame)。
type VideoGenerationV2Req struct {
	Model         string        `json:"model"`
	Content       []ContentItem `json:"content"`
	Resolution    string        `json:"resolution"`
	Duration      *int          `json:"duration"`
	Ratio         string        `json:"ratio"`
	CallbackURL   string        `json:"callback_url,omitempty"`
	AigcWatermark *bool         `json:"aigc_watermark,omitempty"`
}

// CreateResp 创建任务的响应体，成功时仅返回 task_id。
type CreateResp struct {
	TaskID string `json:"task_id"`
}

// QueryResp 查询任务的响应体。
type QueryResp struct {
	Task *VideoTask `json:"task"`
}

// VideoTask 查询任务返回的任务对象。
type VideoTask struct {
	ID         string            `json:"id"`
	Model      string            `json:"model"`
	Status     string            `json:"status"`
	Error      *VideoTaskError   `json:"error,omitempty"`
	CreatedAt  int64             `json:"created_at"`
	UpdatedAt  int64             `json:"updated_at"`
	Content    *VideoTaskContent `json:"content,omitempty"`
	Resolution string            `json:"resolution,omitempty"`
	Duration   int               `json:"duration,omitempty"`
	Usage      *VideoTaskUsage   `json:"usage,omitempty"`
	Ratio      string            `json:"ratio,omitempty"`
	TaskType   string            `json:"task_type,omitempty"`
	Modality   string            `json:"modality,omitempty"`
}

// VideoTaskError 任务失败时的错误信息。
type VideoTaskError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// VideoTaskContent 任务成功后的产物内容。
type VideoTaskContent struct {
	URL string `json:"url,omitempty"`
}

// VideoTaskUsage 任务计费用量（视频任务按秒计量）。
type VideoTaskUsage struct {
	TotalSeconds     int `json:"total_seconds,omitempty"`
	InputSeconds     int `json:"input_seconds,omitempty"`
	OutputSeconds    int `json:"output_seconds,omitempty"`
	InputImageCount  int `json:"input_image_count,omitempty"`
}
