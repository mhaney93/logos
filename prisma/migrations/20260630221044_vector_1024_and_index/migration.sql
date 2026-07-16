-- Resize embedding column to match Voyage AI's voyage-3.5-lite output (1024 dims)
ALTER TABLE "clauses" ALTER COLUMN "embedding" TYPE vector(1024);

-- Speed up cosine-similarity search
CREATE INDEX IF NOT EXISTS "clauses_embedding_idx" ON "clauses" USING hnsw (embedding vector_cosine_ops);
