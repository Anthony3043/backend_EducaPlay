-- Adiciona campos ativo e podeEditarMapaSala ao Usuario
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeEditarMapaSala" BOOLEAN NOT NULL DEFAULT false;

-- Cria tabela MapaSala
CREATE TABLE IF NOT EXISTS "MapaSala" (
    "id" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "assentos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapaSala_pkey" PRIMARY KEY ("id")
);

-- Cria índice único em MapaSala.salaId
CREATE UNIQUE INDEX IF NOT EXISTS "MapaSala_salaId_key" ON "MapaSala"("salaId");

-- Cria tabela BaterPonto
CREATE TABLE IF NOT EXISTS "BaterPonto" (
    "id" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "diaSemana" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaterPonto_pkey" PRIMARY KEY ("id")
);

-- Cria tabela ConfiguracaoEscola
CREATE TABLE IF NOT EXISTS "ConfiguracaoEscola" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "raio" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoEscola_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "MapaSala" ADD CONSTRAINT "MapaSala_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BaterPonto" ADD CONSTRAINT "BaterPonto_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BaterPonto" ADD CONSTRAINT "BaterPonto_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
