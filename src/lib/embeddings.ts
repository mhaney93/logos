const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3.5-lite";

export async function embedText(text: string, inputType: "document" | "query") {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const res = await fetch(VOYAGE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: [text], model: MODEL, input_type: inputType }),
  });

  if (!res.ok) {
    throw new Error(`Voyage embeddings request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

export function toVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}
