-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "instituicao" TEXT,
    "cargo" TEXT,
    "foto" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Professor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "materias" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Sala" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "capacidade" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cronograma" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "turno" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Aula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeStart" TEXT NOT NULL,
    "timeEnd" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "isInterval" BOOLEAN NOT NULL DEFAULT false,
    "cronogramaId" TEXT NOT NULL,
    "professorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aula_cronogramaId_fkey" FOREIGN KEY ("cronogramaId") REFERENCES "Cronograma" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Aula_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Disponibilidade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "diaSemana" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Disponibilidade_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Disponibilidade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🔔',
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
