-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Novel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "novel" TEXT NOT NULL,
    "mainChar" TEXT NOT NULL,
    "charUnder" TEXT,
    "storyDir" TEXT,
    "totalWC" TEXT NOT NULL DEFAULT '短篇（1-3万字）',
    "chapWC" INTEGER NOT NULL DEFAULT 1500,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "analysisTraits" TEXT,
    "analysisConflict" TEXT,
    "outlines" TEXT,
    "selectedOutlineId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Novel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "rel" TEXT NOT NULL DEFAULT '',
    "traits" TEXT NOT NULL DEFAULT '[]',
    "bg" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chapter_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_novelId_index_key" ON "Chapter"("novelId", "index");
