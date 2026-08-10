package minimax_h3

import (
	"net/http"
	"testing"

	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newAdaptor() *TaskAdaptor {
	return &TaskAdaptor{}
}

// TestConvertToRequestPayload_TextToVideo 文生视频：content 仅含 text 项。
func TestConvertToRequestPayload_TextToVideo(t *testing.T) {
	a := newAdaptor()
	req := &relaycommon.TaskSubmitReq{
		Prompt:   "一只奔跑的小狗",
		Duration: 5,
		Size:     "2K",
	}
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "MiniMax-H3"}}

	payload, err := a.convertToRequestPayload(req, info)
	require.NoError(t, err)
	require.NotNil(t, payload)

	assert.Equal(t, "MiniMax-H3", payload.Model)
	assert.Len(t, payload.Content, 1)
	assert.Equal(t, ContentTypeText, payload.Content[0].Type)
	assert.Equal(t, "一只奔跑的小狗", payload.Content[0].Text)
	assert.Nil(t, payload.Content[0].ImageURL)

	assert.Equal(t, Resolution2K, payload.Resolution)
	require.NotNil(t, payload.Duration)
	assert.Equal(t, 5, *payload.Duration)
	// 文生视频必须显式指定非 adaptive 比例
	assert.Equal(t, Ratio16x9, payload.Ratio)
}

// TestConvertToRequestPayload_ImageToVideo 图生视频首帧：content 含 text + image_url(first_frame)。
func TestConvertToRequestPayload_ImageToVideo(t *testing.T) {
	a := newAdaptor()
	req := &relaycommon.TaskSubmitReq{
		Prompt:   "基于首帧生成视频",
		Images:   []string{"https://example.com/first.png"},
		Duration: 8,
	}
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "MiniMax-H3"}}

	payload, err := a.convertToRequestPayload(req, info)
	require.NoError(t, err)
	require.NotNil(t, payload)

	require.Len(t, payload.Content, 2)
	assert.Equal(t, ContentTypeText, payload.Content[0].Type)
	assert.Equal(t, ContentTypeImageURL, payload.Content[1].Type)
	require.NotNil(t, payload.Content[1].ImageURL)
	assert.Equal(t, "https://example.com/first.png", payload.Content[1].ImageURL.URL)
	assert.Equal(t, RoleFirstFrame, payload.Content[1].Role)
	// 图生视频恒为 adaptive
	assert.Equal(t, RatioAdaptive, payload.Ratio)
	assert.Equal(t, 8, *payload.Duration)
}

// TestConvertToRequestPayload_DurationClamp 时长在 4~15 秒范围内钳制。
func TestConvertToRequestPayload_DurationClamp(t *testing.T) {
	a := newAdaptor()
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "MiniMax-H3"}}

	// 超过上限
	p, err := a.convertToRequestPayload(&relaycommon.TaskSubmitReq{Prompt: "p", Duration: 20}, info)
	require.NoError(t, err)
	assert.Equal(t, MaxDuration, *p.Duration)

	// 低于下限
	p, err = a.convertToRequestPayload(&relaycommon.TaskSubmitReq{Prompt: "p", Duration: 1}, info)
	require.NoError(t, err)
	assert.Equal(t, MinDuration, *p.Duration)

	// 未指定 → 默认
	p, err = a.convertToRequestPayload(&relaycommon.TaskSubmitReq{Prompt: "p"}, info)
	require.NoError(t, err)
	assert.Equal(t, DefaultDuration, *p.Duration)
}

// TestConvertToRequestPayload_ImagePrecedence 首帧图片优先级：InputReference > Images[0] > Image。
func TestConvertToRequestPayload_ImagePrecedence(t *testing.T) {
	a := newAdaptor()
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{UpstreamModelName: "MiniMax-H3"}}

	req := &relaycommon.TaskSubmitReq{
		Prompt:         "p",
		InputReference: "https://ref.png",
		Images:         []string{"https://img.png"},
		Image:          "https://single.png",
	}
	payload, err := a.convertToRequestPayload(req, info)
	require.NoError(t, err)
	require.Len(t, payload.Content, 2)
	assert.Equal(t, "https://ref.png", payload.Content[1].ImageURL.URL)
}

// TestParseTaskResult 状态映射。
func TestParseTaskResult(t *testing.T) {
	a := newAdaptor()

	// succeeded + 视频 URL
	r, err := a.ParseTaskResult([]byte(`{"task":{"id":"t1","status":"succeeded","content":{"url":"https://cdn/video.mp4"},"usage":{"total_seconds":6}}}`))
	require.NoError(t, err)
	assert.Equal(t, string(model.TaskStatusSuccess), r.Status)
	assert.Equal(t, "https://cdn/video.mp4", r.Url)
	assert.Equal(t, "100%", r.Progress)

	// queued
	r, err = a.ParseTaskResult([]byte(`{"task":{"id":"t1","status":"queued"}}`))
	require.NoError(t, err)
	assert.Equal(t, string(model.TaskStatusQueued), r.Status)

	// running
	r, err = a.ParseTaskResult([]byte(`{"task":{"id":"t1","status":"running"}}`))
	require.NoError(t, err)
	assert.Equal(t, string(model.TaskStatusInProgress), r.Status)

	// failed + 错误信息
	r, err = a.ParseTaskResult([]byte(`{"task":{"id":"t1","status":"failed","error":{"code":"1004","message":"safety rejected"}}}`))
	require.NoError(t, err)
	assert.Equal(t, string(model.TaskStatusFailure), r.Status)
	assert.Equal(t, "safety rejected", r.Reason)

	// 缺 task 对象
	_, err = a.ParseTaskResult([]byte(`{}`))
	require.Error(t, err)

	// 非 JSON
	_, err = a.ParseTaskResult([]byte(`not-json`))
	require.Error(t, err)
}

// TestAdjustBillingOnComplete 依据实际时长（秒）重算额度。
func TestAdjustBillingOnComplete(t *testing.T) {
	a := newAdaptor()

	// 预扣 5 秒、实际 10 秒：actualQuota = baseQuota × 10
	// task.Quota = baseQuota × 5 → baseQuota = task.Quota / 5
	task := &model.Task{
		Quota: 1000, // 预扣 5 秒 → baseQuota = 200
		Data:  []byte(`{"task":{"id":"t1","status":"succeeded","usage":{"total_seconds":10}}}`),
		PrivateData: model.TaskPrivateData{
			BillingContext: &model.TaskBillingContext{
				OtherRatios: map[string]float64{"seconds": 5},
			},
		},
	}
	actual := a.AdjustBillingOnComplete(task, &relaycommon.TaskInfo{Status: string(model.TaskStatusSuccess)})
	assert.Equal(t, 2000, actual)

	// 失败任务不调整
	taskFail := &model.Task{
		Quota: 1000,
		Data:  []byte(`{"task":{"id":"t1","status":"failed"}}`),
		PrivateData: model.TaskPrivateData{
			BillingContext: &model.TaskBillingContext{OtherRatios: map[string]float64{"seconds": 5}},
		},
	}
	assert.Equal(t, 0, a.AdjustBillingOnComplete(taskFail, &relaycommon.TaskInfo{Status: string(model.TaskStatusFailure)}))

	// 无 seconds ratio → 不调整
	taskNoRatio := &model.Task{
		Quota: 1000,
		Data:  []byte(`{"task":{"id":"t1","status":"succeeded","usage":{"total_seconds":10}}}`),
		PrivateData: model.TaskPrivateData{
			BillingContext: &model.TaskBillingContext{OtherRatios: map[string]float64{}},
		},
	}
	assert.Equal(t, 0, a.AdjustBillingOnComplete(taskNoRatio, &relaycommon.TaskInfo{Status: string(model.TaskStatusSuccess)}))
}

// TestExtractOaiError 从 OpenAI 风格错误响应中提取 message / http_code。
func TestExtractOaiError(t *testing.T) {
	body := []byte(`{"type":"error","error":{"type":"bad_request_error","message":"bad prompt (1004)","http_code":"400"},"request_id":"r1"}`)

	assert.Equal(t, "bad prompt (1004)", extractOaiErrorMessage(body))
	assert.Equal(t, 400, extractOaiErrorHTTPCode(http.StatusOK, body))
	assert.Equal(t, 429, extractOaiErrorHTTPCode(429, body))
}
