from openai import OpenAI

client = OpenAI(
    api_key="sk-fohCbrX6gl4LkzPhftbOUgGNtyx0JGBe0rRXZcds8l6Lm3xU",  # 平台颁发的令牌
    base_url="http://localhost:3000/v1"
)

# 流式请求
response = client.chat.completions.create(
    model="deepseek-v4-flash",
    messages=[{"role": "user", "content": "deepseek有哪些模型."}],
    stream=True,
    temperature=0.7,  # 可选参数
    # max_tokens=100     # 可选参数
)

# 实时打印流式内容
print("AI: ", end="", flush=True)
for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()  # 打印完毕，换行


"""
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-fohCbrX6gl4LkzPhftbOUgGNtyx0JGBe0rRXZcds8l6Lm3xU" \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"Say hello in one sentence."}]}'
  
"""