-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clauses" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" vector(1536),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arguments" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conclusionId" TEXT NOT NULL,

    CONSTRAINT "arguments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "argument_premises" (
    "argumentId" TEXT NOT NULL,
    "clauseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "argument_premises_pkey" PRIMARY KEY ("argumentId","clauseId")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL,
    "citingArgumentId" TEXT NOT NULL,
    "citedArgumentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "voterId" TEXT NOT NULL,
    "clauseId" TEXT,
    "argumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "clauses_authorId_idx" ON "clauses"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "arguments_conclusionId_key" ON "arguments"("conclusionId");

-- CreateIndex
CREATE INDEX "arguments_authorId_idx" ON "arguments"("authorId");

-- CreateIndex
CREATE INDEX "argument_premises_clauseId_idx" ON "argument_premises"("clauseId");

-- CreateIndex
CREATE INDEX "citations_citedArgumentId_idx" ON "citations"("citedArgumentId");

-- CreateIndex
CREATE UNIQUE INDEX "citations_citingArgumentId_citedArgumentId_key" ON "citations"("citingArgumentId", "citedArgumentId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_voterId_clauseId_key" ON "votes"("voterId", "clauseId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_voterId_argumentId_key" ON "votes"("voterId", "argumentId");

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arguments" ADD CONSTRAINT "arguments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arguments" ADD CONSTRAINT "arguments_conclusionId_fkey" FOREIGN KEY ("conclusionId") REFERENCES "clauses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "argument_premises" ADD CONSTRAINT "argument_premises_argumentId_fkey" FOREIGN KEY ("argumentId") REFERENCES "arguments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "argument_premises" ADD CONSTRAINT "argument_premises_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "clauses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_citingArgumentId_fkey" FOREIGN KEY ("citingArgumentId") REFERENCES "arguments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_citedArgumentId_fkey" FOREIGN KEY ("citedArgumentId") REFERENCES "arguments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "clauses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_argumentId_fkey" FOREIGN KEY ("argumentId") REFERENCES "arguments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
