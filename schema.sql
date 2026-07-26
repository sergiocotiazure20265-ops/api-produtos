CREATE TABLE IF NOT EXISTS produtos (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    preco NUMERIC(12, 2) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_produtos_nome
        CHECK (char_length(trim(nome)) >= 3),

    CONSTRAINT ck_produtos_preco
        CHECK (preco > 0),

    CONSTRAINT ck_produtos_quantidade
        CHECK (quantidade >= 0)
);