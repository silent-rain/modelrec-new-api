package zhipu

// ModelList 智谱（bigmodel）视频生成模型列表。
// 文档：https://docs.bigmodel.cn/cn/guide/models/video-generation/cogvideox-3
// 统一走异步接口 POST /api/paas/v4/videos/generations + GET /api/paas/v4/async-result/{id}
var ModelList = []string{
	// CogVideoX 系列
	"cogvideox-3",       // CogVideoX-3（文生/图生/首尾帧，支持 quality/with_audio/fps，时长 5/10）
	"cogvideox-2",       // CogVideoX-2（文生/图生，支持 quality/with_audio/fps）
	"cogvideox-flash",   // CogVideoX-Flash（文生/图生，速度快）
	// Vidu Q1 / Vidu 2 系列（智谱平台接入）
	"viduq1-text",        // Vidu Q1 文生视频
	"viduq1-image",       // Vidu Q1 图生视频
	"vidu2-image",        // Vidu 2 图生视频
	"viduq1-start-end",   // Vidu Q1 首尾帧生视频
	"vidu2-start-end",    // Vidu 2 首尾帧生视频
	"vidu2-reference",    // Vidu 2 参考生视频（1~3 张参考图）
}

var ChannelName = "zhipu"
