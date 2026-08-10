package minimax_h3

import (
	"bytes"
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
)

// TaskAdaptor 实现 MiniMax-H3 视频生成 V2 API 的异步任务适配器。
// 支持文生视频（content 仅含 text）与图生视频（content 含 text + image_url 首帧）。
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

func (a *TaskAdaptor) ValidateRequestAndSetAction(c *gin.Context, info *relaycommon.RelayInfo) (taskErr *dto.TaskError) {
	return relaycommon.ValidateBasicTaskRequest(c, info, constant.TaskActionGenerate)
}

func (a *TaskAdaptor) BuildRequestURL(info *relaycommon.RelayInfo) (string, error) {
	return fmt.Sprintf("%s%s", a.baseURL, CreateVideoEndpoint), nil
}

func (a *TaskAdaptor) BuildRequestHeader(c *gin.Context, req *http.Request, info *relaycommon.RelayInfo) error {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.apiKey)
	return nil
}

func (a *TaskAdaptor) BuildRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (io.Reader, error) {
	v, exists := c.Get("task_request")
	if !exists {
		return nil, fmt.Errorf("request not found in context")
	}
	req, ok := v.(relaycommon.TaskSubmitReq)
	if !ok {
		return nil, fmt.Errorf("invalid request type in context")
	}

	body, err := a.convertToRequestPayload(&req, info)
	if err != nil {
		return nil, errors.Wrap(err, "convert request payload failed")
	}

	data, err := common.Marshal(body)
	if err != nil {
		return nil, err
	}

	return bytes.NewReader(data), nil
}

// convertToRequestPayload 构造 /v2/video_generation 请求体。
// 文生视频: content 仅含 text 项；图生视频: content 含 text + image_url(first_frame)。
func (a *TaskAdaptor) convertToRequestPayload(req *relaycommon.TaskSubmitReq, info *relaycommon.RelayInfo) (*VideoGenerationV2Req, error) {
	duration := DefaultDuration
	if req.Duration > 0 {
		duration = req.Duration
	}
	if duration < MinDuration {
		duration = MinDuration
	}
	if duration > MaxDuration {
		duration = MaxDuration
	}

	payload := &VideoGenerationV2Req{
		Model:      info.UpstreamModelName,
		Resolution: DefaultResolution,
		Duration:   &duration,
	}

	// 支持通过 metadata 覆盖 resolution / ratio / aigc_watermark 等可选字段。
	// model / content / duration 在 metadata 之后显式设置，防止被覆盖造成计费绕过。
	if err := taskcommon.UnmarshalMetadata(req.Metadata, payload); err != nil {
		return nil, errors.Wrap(err, "unmarshal metadata to video request failed")
	}

	// 图生视频首帧：从 images / image / input_reference 中取首张图片
	content := []ContentItem{
		{Type: ContentTypeText, Text: req.Prompt},
	}
	if img := a.extractFirstImage(req); img != "" {
		content = append(content, ContentItem{
			Type:     ContentTypeImageURL,
			ImageURL: &ImageURL{URL: img},
			Role:     RoleFirstFrame,
		})
	}

	payload.Model = info.UpstreamModelName
	payload.Content = content
	payload.Duration = &duration

	// 从 size 字段解析分辨率（768P / 2K），仅当 metadata 未覆盖时使用
	if payload.Resolution == "" && req.Size != "" {
		payload.Resolution = a.parseResolutionFromSize(req.Size)
	}

	// ratio: 文生视频必须显式且不可为 adaptive；图生视频恒为 adaptive
	if a.hasImage(content) {
		payload.Ratio = RatioAdaptive
	} else {
		if payload.Ratio == "" {
			payload.Ratio = Ratio16x9
		}
	}

	return payload, nil
}

// extractFirstImage 从 TaskSubmitReq 中提取首帧图片地址。
func (a *TaskAdaptor) extractFirstImage(req *relaycommon.TaskSubmitReq) string {
	if req.InputReference != "" {
		return req.InputReference
	}
	if len(req.Images) > 0 {
		return req.Images[0]
	}
	if strings.TrimSpace(req.Image) != "" {
		return req.Image
	}
	return ""
}

func (a *TaskAdaptor) hasImage(content []ContentItem) bool {
	for _, item := range content {
		if item.Type == ContentTypeImageURL {
			return true
		}
	}
	return false
}

func (a *TaskAdaptor) parseResolutionFromSize(size string) string {
	upper := strings.ToUpper(strings.TrimSpace(size))
	switch {
	case strings.Contains(upper, "2K"), strings.Contains(upper, "2560"), strings.Contains(upper, "2048"):
		return Resolution2K
	default:
		return Resolution768P
	}
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

	var createResp CreateResp
	if err := common.Unmarshal(responseBody, &createResp); err != nil {
		taskErr = service.TaskErrorWrapper(errors.Wrapf(err, "body: %s", responseBody), "unmarshal_response_body_failed", http.StatusInternalServerError)
		return
	}

	if strings.TrimSpace(createResp.TaskID) == "" {
		// 出错时上游返回 OpenAI 风格 OaiError
		taskErr = service.TaskErrorWrapper(
			fmt.Errorf("minimax h3 api error: %s", extractOaiErrorMessage(responseBody)),
			"upstream_error",
			extractOaiErrorHTTPCode(resp.StatusCode, responseBody),
		)
		return
	}

	ov := dto.NewOpenAIVideo()
	ov.ID = info.PublicTaskID
	ov.TaskID = info.PublicTaskID
	ov.CreatedAt = time.Now().Unix()
	ov.Model = info.OriginModelName

	c.JSON(http.StatusOK, ov)
	return createResp.TaskID, responseBody, nil
}

func (a *TaskAdaptor) GetModelList() []string {
	return ModelList
}

func (a *TaskAdaptor) GetChannelName() string {
	return ChannelName
}

// EstimateBilling 预扣费时按生成时长（秒）计费。
func (a *TaskAdaptor) EstimateBilling(c *gin.Context, info *relaycommon.RelayInfo) map[string]float64 {
	v, ok := c.Get("task_request")
	if !ok {
		return nil
	}
	req, ok := v.(relaycommon.TaskSubmitReq)
	if !ok {
		return nil
	}
	duration := req.Duration
	if duration <= 0 {
		duration = DefaultDuration
	}
	return map[string]float64{
		"seconds": float64(duration),
	}
}

// AdjustBillingOnSubmit 提交后无需额外调整，直接返回 nil。
func (a *TaskAdaptor) AdjustBillingOnSubmit(_ *relaycommon.RelayInfo, _ []byte) map[string]float64 {
	return nil
}

// FetchTask 查询任务状态，GET /v2/query/video_generation/{task_id}。
func (a *TaskAdaptor) FetchTask(baseUrl, key string, body map[string]any, proxy string) (*http.Response, error) {
	taskID, ok := body["task_id"].(string)
	if !ok || taskID == "" {
		return nil, fmt.Errorf("invalid task_id")
	}

	uri := fmt.Sprintf("%s"+QueryTaskEndpoint, baseUrl, taskID)

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

// ParseTaskResult 解析查询任务的响应，将上游状态映射为网关内部 TaskStatus。
func (a *TaskAdaptor) ParseTaskResult(respBody []byte) (*relaycommon.TaskInfo, error) {
	var queryResp QueryResp
	if err := common.Unmarshal(respBody, &queryResp); err != nil {
		return nil, errors.Wrap(err, "unmarshal task result failed")
	}
	if queryResp.Task == nil {
		return nil, fmt.Errorf("missing task in query response")
	}

	task := queryResp.Task
	taskResult := &relaycommon.TaskInfo{
		Code: 0,
	}

	switch task.Status {
	case StatusQueued:
		taskResult.Status = model.TaskStatusQueued
		taskResult.Progress = "20%"
	case StatusRunning:
		taskResult.Status = model.TaskStatusInProgress
		taskResult.Progress = "50%"
	case StatusSucceeded:
		taskResult.Status = model.TaskStatusSuccess
		taskResult.Progress = "100%"
		if task.Content != nil && task.Content.URL != "" {
			taskResult.Url = task.Content.URL
		}
	case StatusFailed, StatusCancelled:
		taskResult.Status = model.TaskStatusFailure
		taskResult.Progress = "100%"
		if task.Error != nil && task.Error.Message != "" {
			taskResult.Reason = task.Error.Message
		} else {
			taskResult.Reason = "task failed"
		}
	default:
		taskResult.Status = model.TaskStatusInProgress
		taskResult.Progress = "30%"
	}

	return taskResult, nil
}

// AdjustBillingOnComplete 任务完成时依据实际时长（秒）重算额度。
// 返回正数触发差额结算（补扣/退还），返回 0 保持预扣金额不变。
func (a *TaskAdaptor) AdjustBillingOnComplete(task *model.Task, taskResult *relaycommon.TaskInfo) int {
	if taskResult.Status == string(model.TaskStatusFailure) {
		return 0
	}

	// 从 task.Data（原始查询响应）解析实际 usage.total_seconds
	var queryResp QueryResp
	if err := common.Unmarshal(task.Data, &queryResp); err != nil || queryResp.Task == nil {
		return 0
	}
	usage := queryResp.Task.Usage
	if usage == nil || usage.TotalSeconds <= 0 {
		return 0
	}

	// 依据 BillingContext 重算实际额度。
	// 仅当任务按秒预扣（OtherRatios 含 seconds）时才能可靠地重算；
	// 否则保持预扣金额不变。
	bc := task.PrivateData.BillingContext
	if bc == nil {
		return 0
	}
	secondsRatio, ok := bc.OtherRatios["seconds"]
	if !ok || secondsRatio <= 0 {
		return 0
	}

	// task.Quota = baseQuota × estimatedSeconds → baseQuota = task.Quota / estimatedSeconds
	baseQuota := int(float64(task.Quota) / secondsRatio)
	actualQuota := int(float64(baseQuota) * float64(usage.TotalSeconds))
	if actualQuota <= 0 {
		return 0
	}
	return actualQuota
}

// ConvertToOpenAIVideo 将网关任务转换为 OpenAI 兼容的视频响应体。
func (a *TaskAdaptor) ConvertToOpenAIVideo(originTask *model.Task) ([]byte, error) {
	openAIVideo := originTask.ToOpenAIVideo()

	// 从 task.Data 解析失败原因
	var queryResp QueryResp
	if err := common.Unmarshal(originTask.Data, &queryResp); err == nil && queryResp.Task != nil {
		if t := queryResp.Task; t.Status == StatusFailed && t.Error != nil {
			openAIVideo.Error = &dto.OpenAIVideoError{
				Message: t.Error.Message,
				Code:    t.Error.Code,
			}
		}
	}

	jsonData, err := common.Marshal(openAIVideo)
	if err != nil {
		return nil, errors.Wrap(err, "marshal openai video failed")
	}
	return jsonData, nil
}

// extractOaiErrorMessage 从 OpenAI 风格错误响应中提取错误消息。
func extractOaiErrorMessage(body []byte) string {
	var errResp struct {
		Error *struct {
			Message string `json:"message"`
			Code    string `json:"code"`
		} `json:"error"`
	}
	if err := common.Unmarshal(body, &errResp); err == nil && errResp.Error != nil {
		if errResp.Error.Message != "" {
			return errResp.Error.Message
		}
		if errResp.Error.Code != "" {
			return errResp.Error.Code
		}
	}
	return string(body)
}

// extractOaiErrorHTTPCode 从 OpenAI 风格错误响应中提取 HTTP 状态码；
// 上游响应本身的状态码优先（400/401/402/422/429/500），否则用响应体中的 http_code。
func extractOaiErrorHTTPCode(respStatusCode int, body []byte) int {
	if respStatusCode != http.StatusOK {
		return respStatusCode
	}
	var errResp struct {
		Error *struct {
			HTTPCode string `json:"http_code"`
		} `json:"error"`
	}
	if err := common.Unmarshal(body, &errResp); err == nil && errResp.Error != nil && errResp.Error.HTTPCode != "" {
		if code, err := strconv.Atoi(errResp.Error.HTTPCode); err == nil {
			return code
		}
	}
	return http.StatusBadRequest
}
