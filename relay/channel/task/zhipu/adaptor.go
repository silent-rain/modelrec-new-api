package zhipu

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel"
	taskcommon "github.com/QuantumNous/new-api/relay/channel/task/taskcommon"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
	"github.com/samber/lo"
)

// ============================
// Request / Response structures
// ============================

// zhipuVideoRequest 智谱视频生成请求体。
// image_url 同时支持单张字符串（图生视频）与双张数组（首尾帧/参考生视频）。
type zhipuVideoRequest struct {
	Model             string          `json:"model"`
	Prompt            string          `json:"prompt,omitempty"`
	ImageURL          json.RawMessage `json:"image_url,omitempty"`
	Size              string          `json:"size,omitempty"`
	FPS               *int            `json:"fps,omitempty"`
	Duration          *int            `json:"duration,omitempty"`
	Quality           string          `json:"quality,omitempty"`
	WithAudio         *bool           `json:"with_audio,omitempty"`
	WatermarkEnabled  *bool           `json:"watermark_enabled,omitempty"`
	Style             string          `json:"style,omitempty"`
	AspectRatio       string          `json:"aspect_ratio,omitempty"`
	MovementAmplitude string          `json:"movement_amplitude,omitempty"`
	RequestID         string          `json:"request_id,omitempty"`
	UserID            string          `json:"user_id,omitempty"`
}

// zhipuAsyncResponse 提交任务的响应（AsyncResponse）。
type zhipuAsyncResponse struct {
	Model      string `json:"model"`
	ID         string `json:"id"`
	RequestID  string `json:"request_id"`
	TaskStatus string `json:"task_status"`
	Error      *zhipuError `json:"error,omitempty"`
}

// zhipuTaskResult 查询异步任务结果的响应（AsyncVideoGenerationResponse）。
type zhipuTaskResult struct {
	Model       string             `json:"model"`
	TaskStatus  string             `json:"task_status"`
	VideoResult []zhipuVideoResult `json:"video_result"`
	RequestID   string             `json:"request_id"`
	Error       *zhipuError        `json:"error,omitempty"`
}

type zhipuVideoResult struct {
	URL           string `json:"url"`
	CoverImageURL string `json:"cover_image_url"`
}

type zhipuError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ============================
// Adaptor implementation
// ============================

type TaskAdaptor struct {
	taskcommon.BaseBilling
	ChannelType int
	apiKey      string
	baseURL     string
}

func (a *TaskAdaptor) Init(info *relaycommon.RelayInfo) {
	a.ChannelType = info.ChannelType
	a.baseURL = info.ChannelBaseUrl
	a.apiKey = info.ApiKey
}

func (a *TaskAdaptor) ValidateRequestAndSetAction(c *gin.Context, info *relaycommon.RelayInfo) *dto.TaskError {
	if err := relaycommon.ValidateBasicTaskRequest(c, info, constant.TaskActionGenerate); err != nil {
		return err
	}
	req, err := relaycommon.GetTaskRequest(c)
	if err != nil {
		return service.TaskErrorWrapper(err, "get_task_request_failed", http.StatusBadRequest)
	}

	// 按模型与图像数量确定 action：
	//   - vidu2-reference            -> 参考生视频
	//   - *-start-end               -> 首尾帧生视频
	//   - 其余模型 0 图=文生，1 图=图生，cogvideox-3 2 图=首尾帧
	action := constant.TaskActionTextGenerate
	if metaAction, ok := req.Metadata["action"]; ok {
		action, _ = metaAction.(string)
	} else if req.HasImage() {
		modelName := info.UpstreamModelName
		if modelName == "" {
			modelName = req.Model
		}
		switch {
		case modelName == "vidu2-reference":
			action = constant.TaskActionReferenceGenerate
		case strings.HasSuffix(modelName, "-start-end"):
			action = constant.TaskActionFirstTailGenerate
		case len(req.Images) == 2 && modelName == "cogvideox-3":
			action = constant.TaskActionFirstTailGenerate
		default:
			action = constant.TaskActionGenerate
		}
	}
	info.Action = action
	return nil
}

// EstimateBilling 按时长（seconds）返回计费倍率，配合后台模型单价。
func (a *TaskAdaptor) EstimateBilling(c *gin.Context, info *relaycommon.RelayInfo) map[string]float64 {
	req, err := relaycommon.GetTaskRequest(c)
	if err != nil {
		return nil
	}
	seconds := defaultDuration(info.OriginModelName)
	if req.Duration > 0 {
		seconds = req.Duration
	} else if v, err := strconv.Atoi(req.Seconds); err == nil && v > 0 {
		seconds = v
	}
	return map[string]float64{"seconds": float64(seconds)}
}

// defaultDuration 各模型默认视频时长（秒）。vidu2 系列默认 4 秒，其余默认 5 秒。
func defaultDuration(model string) int {
	if strings.HasPrefix(model, "vidu2-") {
		return 4
	}
	return 5
}

func (a *TaskAdaptor) BuildRequestURL(info *relaycommon.RelayInfo) (string, error) {
	return fmt.Sprintf("%s/api/paas/v4/videos/generations", a.baseURL), nil
}

func (a *TaskAdaptor) BuildRequestHeader(c *gin.Context, req *http.Request, info *relaycommon.RelayInfo) error {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.apiKey)
	return nil
}

func (a *TaskAdaptor) BuildRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (io.Reader, error) {
	req, err := relaycommon.GetTaskRequest(c)
	if err != nil {
		return nil, errors.Wrap(err, "get_task_request_failed")
	}

	body, err := a.convertToRequestPayload(&req, info)
	if err != nil {
		return nil, err
	}

	data, err := common.Marshal(body)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(data), nil
}

// convertToRequestPayload 将统一 TaskSubmitReq 转换为智谱请求体。
// 各模型差异通过字段控制（omitempty 自动省略），并做两件事保证协议正确：
//  1. image_url 按模型格式要求编码（字符串 vs 数组）
//  2. 过滤当前模型不支持的 metadata 参数，避免上游 400
func (a *TaskAdaptor) convertToRequestPayload(req *relaycommon.TaskSubmitReq, info *relaycommon.RelayInfo) (*zhipuVideoRequest, error) {
	modelName := info.UpstreamModelName
	if modelName == "" {
		modelName = req.Model
	}

	r := &zhipuVideoRequest{
		Model:  modelName,
		Prompt: req.Prompt,
	}

	// image_url 格式：
	//   - vidu2-reference / *-start-end：始终数组（参考图 1~3 张、首尾帧 2 张）
	//   - cogvideox-3：1 张字符串，2 张数组（首尾帧）
	//   - 其余（cogvideox-2/-flash、viduq1-image、vidu2-image）：仅单张字符串
	if len(req.Images) > 0 {
		raw, err := encodeImageURL(modelName, req.Images)
		if err != nil {
			return nil, err
		}
		r.ImageURL = raw
	}

	// 兼容 metadata 传参，但过滤当前模型不支持的字段
	metadata := filterMetadata(modelName, req.Metadata)
	if err := taskcommon.UnmarshalMetadata(metadata, r); err != nil {
		return nil, errors.Wrap(err, "unmarshal metadata failed")
	}

	// size：统一从 req.Size 取（如 "1920x1080" / "1280x720"），空则交给上游默认
	if req.Size != "" {
		r.Size = req.Size
	}

	// duration（默认由上游决定，此处仅显式覆盖用户传入值）
	if req.Duration > 0 {
		r.Duration = lo.ToPtr(req.Duration)
	} else if v, err := strconv.Atoi(req.Seconds); err == nil && v > 0 {
		r.Duration = lo.ToPtr(v)
	}

	return r, nil
}

// encodeImageURL 按模型要求编码 image_url 字段。
func encodeImageURL(modelName string, images []string) (json.RawMessage, error) {
	// 参考生视频 / 首尾帧生视频：image_url 必须是数组
	if modelName == "vidu2-reference" || strings.HasSuffix(modelName, "-start-end") {
		raw, err := common.Marshal(images)
		if err != nil {
			return nil, errors.Wrap(err, "marshal image_url array failed")
		}
		return raw, nil
	}
	// cogvideox-3：1 张字符串，2 张数组（首尾帧）
	if modelName == "cogvideox-3" && len(images) > 1 {
		raw, err := common.Marshal(images)
		if err != nil {
			return nil, errors.Wrap(err, "marshal image_url array failed")
		}
		return raw, nil
	}
	// 其余模型仅支持单张
	if len(images) > 1 {
		return nil, fmt.Errorf("model %s only supports a single image", modelName)
	}
	raw, err := common.Marshal(images[0])
	if err != nil {
		return nil, errors.Wrap(err, "marshal single image_url failed")
	}
	return raw, nil
}

// filterMetadata 过滤当前模型不支持的 metadata 参数。
// CogVideoX 支持 quality/fps/watermark_enabled/with_audio；Vidu 系列不支持这些。
func filterMetadata(modelName string, metadata map[string]any) map[string]any {
	if metadata == nil {
		return nil
	}
	isCogVideoX := strings.HasPrefix(modelName, "cogvideox")
	isViduText := modelName == "viduq1-text"
	result := make(map[string]any, len(metadata))
	for k, v := range metadata {
		switch k {
		case "quality", "fps", "watermark_enabled":
			if !isCogVideoX {
				continue
			}
		case "style", "aspect_ratio", "movement_amplitude":
			if isCogVideoX {
				continue
			}
		case "with_audio":
			if isViduText {
				continue
			}
		}
		result[k] = v
	}
	return result
}

func (a *TaskAdaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (*http.Response, error) {
	return channel.DoTaskApiRequest(a, c, info, requestBody)
}

func (a *TaskAdaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (taskID string, taskData []byte, taskErr *dto.TaskError) {
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		taskErr = service.TaskErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
		return
	}
	_ = resp.Body.Close()

	var aResp zhipuAsyncResponse
	if err := common.Unmarshal(responseBody, &aResp); err != nil {
		taskErr = service.TaskErrorWrapper(errors.Wrapf(err, "body: %s", responseBody), "unmarshal_response_body_failed", http.StatusInternalServerError)
		return
	}

	// 非 2xx：优先提取 error 信息，避免误报 "task_id is empty"
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if aResp.Error != nil && aResp.Error.Message != "" {
			taskErr = service.TaskErrorWrapper(fmt.Errorf("%s: %s", aResp.Error.Code, aResp.Error.Message), "zhipu_api_error", resp.StatusCode)
		} else {
			taskErr = service.TaskErrorWrapper(fmt.Errorf("unexpected status: %d, body: %s", resp.StatusCode, responseBody), "zhipu_api_error", resp.StatusCode)
		}
		return
	}
	if aResp.ID == "" {
		taskErr = service.TaskErrorWrapper(fmt.Errorf("task_id is empty"), "invalid_response", http.StatusInternalServerError)
		return
	}

	ov := dto.NewOpenAIVideo()
	ov.ID = info.PublicTaskID
	ov.TaskID = info.PublicTaskID
	ov.CreatedAt = time.Now().Unix()
	ov.Model = info.OriginModelName

	c.JSON(http.StatusOK, ov)
	return aResp.ID, responseBody, nil
}

func (a *TaskAdaptor) FetchTask(baseUrl, key string, body map[string]any, proxy string) (*http.Response, error) {
	taskID, ok := body["task_id"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid task_id")
	}
	uri := fmt.Sprintf("%s/api/paas/v4/async-result/%s", baseUrl, taskID)

	req, err := http.NewRequest(http.MethodGet, uri, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)

	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		return nil, fmt.Errorf("new proxy http client failed: %w", err)
	}
	return client.Do(req)
}

func (a *TaskAdaptor) GetModelList() []string {
	return ModelList
}

func (a *TaskAdaptor) GetChannelName() string {
	return ChannelName
}

func (a *TaskAdaptor) ParseTaskResult(respBody []byte) (*relaycommon.TaskInfo, error) {
	var res zhipuTaskResult
	if err := common.Unmarshal(respBody, &res); err != nil {
		return nil, errors.Wrap(err, "unmarshal zhipu task result failed")
	}

	taskResult := relaycommon.TaskInfo{Code: 0}
	switch res.TaskStatus {
	case "PROCESSING":
		taskResult.Status = model.TaskStatusInProgress
	case "SUCCESS":
		taskResult.Status = model.TaskStatusSuccess
		if len(res.VideoResult) > 0 {
			taskResult.Url = res.VideoResult[0].URL
		}
	case "FAIL":
		taskResult.Status = model.TaskStatusFailure
		if res.Error != nil && res.Error.Message != "" {
			taskResult.Reason = res.Error.Message
		} else {
			taskResult.Reason = "task failed"
		}
	default:
		taskResult.Status = model.TaskStatusInProgress
	}
	return &taskResult, nil
}

func (a *TaskAdaptor) ConvertToOpenAIVideo(task *model.Task) ([]byte, error) {
	var res zhipuTaskResult
	if err := common.Unmarshal(task.Data, &res); err != nil {
		return nil, errors.Wrap(err, "unmarshal zhipu task data failed")
	}

	openAIVideo := dto.NewOpenAIVideo()
	openAIVideo.ID = task.TaskID
	openAIVideo.TaskID = task.TaskID
	openAIVideo.Status = task.Status.ToVideoStatus()
	openAIVideo.SetProgressStr(task.Progress)
	openAIVideo.CreatedAt = task.CreatedAt
	openAIVideo.CompletedAt = task.UpdatedAt
	openAIVideo.Model = task.Properties.OriginModelName

	if len(res.VideoResult) > 0 && res.VideoResult[0].URL != "" {
		openAIVideo.SetMetadata("url", res.VideoResult[0].URL)
	}

	if res.TaskStatus == "FAIL" && res.Error != nil {
		openAIVideo.Error = &dto.OpenAIVideoError{
			Code:    res.Error.Code,
			Message: res.Error.Message,
		}
	}

	return common.Marshal(openAIVideo)
}
