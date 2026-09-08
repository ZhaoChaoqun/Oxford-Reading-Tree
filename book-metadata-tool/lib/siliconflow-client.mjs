const ENDPOINT = 'https://api.siliconflow.cn/v1/chat/completions';

export async function callSiliconFlow({ model, messages, apiKey, fetchImpl = fetch }) {
  if (!apiKey) {
    throw new Error('Missing SiliconFlow API key.');
  }

  const requestBody = {
    model,
    messages,
  };

  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });
  const finishedAt = new Date().toISOString();
  const latencyMs = Date.now() - startMs;

  const rawResponseJson = await response.json();
  if (!response.ok) {
    throw new Error(`SiliconFlow request failed with status ${response.status}: ${JSON.stringify(rawResponseJson)}`);
  }

  const rawResponseText = rawResponseJson?.choices?.[0]?.message?.content;
  if (typeof rawResponseText !== 'string' || rawResponseText.trim() === '') {
    throw new Error('SiliconFlow response did not include choices[0].message.content.');
  }

  return {
    requestBody,
    rawResponseJson,
    rawResponseText,
    startedAt,
    finishedAt,
    latencyMs,
  };
}