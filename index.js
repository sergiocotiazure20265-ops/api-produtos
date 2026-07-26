require('dotenv').config();

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Conexão com PostgreSQL
|--------------------------------------------------------------------------
*/

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: String(process.env.DB_SSL).toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : false
});

pool.on('error', error => {
    console.error('Erro inesperado na conexão com PostgreSQL:', error);
});

/*
|--------------------------------------------------------------------------
| Configuração do Swagger
|--------------------------------------------------------------------------
*/

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',

        info: {
            title: 'API de Produtos - Treinamento AWS COTI Informática',
            version: '2.0.0',
            description:
                'API REST de produtos utilizando Node.js, Express e PostgreSQL'
        },

        servers: [
            {
                url: '/',
                description: 'Servidor da aplicação'
            }
        ],

        components: {
            schemas: {
                ProdutoRequest: {
                    type: 'object',

                    required: [
                        'nome',
                        'preco',
                        'quantidade'
                    ],

                    properties: {
                        nome: {
                            type: 'string',
                            example: 'Monitor LG'
                        },

                        preco: {
                            type: 'number',
                            format: 'double',
                            example: 1200.00
                        },

                        quantidade: {
                            type: 'integer',
                            example: 8
                        }
                    }
                },

                ProdutoResponse: {
                    type: 'object',

                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },

                        nome: {
                            type: 'string',
                            example: 'Monitor LG'
                        },

                        preco: {
                            type: 'number',
                            format: 'double',
                            example: 1200.00
                        },

                        quantidade: {
                            type: 'integer',
                            example: 8
                        }
                    }
                },

                Erro: {
                    type: 'object',

                    properties: {
                        mensagem: {
                            type: 'string',
                            example: 'Produto não encontrado.'
                        }
                    }
                }
            }
        }
    },

    apis: [__filename]
};

const swaggerDocument = swaggerJsdoc(swaggerOptions);

app.use(
    '/swagger',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

/*
|--------------------------------------------------------------------------
| Rota inicial
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /:
 *   get:
 *     summary: Página inicial da API
 *     tags:
 *       - Aplicação
 *     responses:
 *       200:
 *         description: API em funcionamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: API de produtos em funcionamento.
 *                 bancoDados:
 *                   type: string
 *                   example: PostgreSQL
 *                 documentacao:
 *                   type: string
 *                   example: /swagger
 */
app.get('/', (request, response) => {
    response.status(200).json({
        mensagem: 'API de produtos em funcionamento.',
        bancoDados: 'PostgreSQL',
        documentacao: '/swagger'
    });
});

/*
|--------------------------------------------------------------------------
| Health check
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica a saúde da aplicação e do PostgreSQL
 *     tags:
 *       - Aplicação
 *     responses:
 *       200:
 *         description: Aplicação e banco funcionando
 *       503:
 *         description: Banco de dados indisponível
 */
app.get('/health', async (request, response) => {
    try {
        await pool.query('SELECT 1');

        return response.status(200).json({
            status: 'UP',
            aplicacao: 'api-produtos',
            bancoDados: 'UP',
            dataHora: new Date().toISOString()
        });
    } catch (error) {
        console.error(error);

        return response.status(503).json({
            status: 'DOWN',
            aplicacao: 'api-produtos',
            bancoDados: 'DOWN',
            mensagem: 'Não foi possível conectar ao PostgreSQL.',
            dataHora: new Date().toISOString()
        });
    }
});

/*
|--------------------------------------------------------------------------
| Consultar todos os produtos
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/produtos:
 *   get:
 *     summary: Consulta todos os produtos
 *     tags:
 *       - Produtos
 *     responses:
 *       200:
 *         description: Lista de produtos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProdutoResponse'
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/produtos', async (request, response) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                nome,
                preco::double precision AS preco,
                quantidade
            FROM produtos
            ORDER BY id
        `);

        return response.status(200).json(resultado.rows);
    } catch (error) {
        return responderErroBanco(response, error);
    }
});

/*
|--------------------------------------------------------------------------
| Consultar produto por ID
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/produtos/{id}:
 *   get:
 *     summary: Consulta um produto pelo ID
 *     tags:
 *       - Produtos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do produto
 *     responses:
 *       200:
 *         description: Produto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProdutoResponse'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Produto não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/produtos/:id', async (request, response) => {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return response.status(400).json({
            mensagem: 'O ID deve ser um número inteiro maior que zero.'
        });
    }

    try {
        const resultado = await pool.query(`
            SELECT
                id,
                nome,
                preco::double precision AS preco,
                quantidade
            FROM produtos
            WHERE id = $1
        `, [id]);

        if (resultado.rowCount === 0) {
            return response.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        return response.status(200).json(resultado.rows[0]);
    } catch (error) {
        return responderErroBanco(response, error);
    }
});

/*
|--------------------------------------------------------------------------
| Cadastrar produto
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/produtos:
 *   post:
 *     summary: Cadastra um novo produto
 *     tags:
 *       - Produtos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProdutoRequest'
 *     responses:
 *       201:
 *         description: Produto cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProdutoResponse'
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */
app.post('/api/produtos', async (request, response) => {
    const { nome, preco, quantidade } = request.body;

    const erro = validarProduto({
        nome,
        preco,
        quantidade
    });

    if (erro) {
        return response.status(400).json({
            mensagem: erro
        });
    }

    try {
        const resultado = await pool.query(`
            INSERT INTO produtos (
                nome,
                preco,
                quantidade
            )
            VALUES ($1, $2, $3)
            RETURNING
                id,
                nome,
                preco::double precision AS preco,
                quantidade
        `, [
            nome.trim(),
            Number(preco),
            Number(quantidade)
        ]);

        return response.status(201).json(resultado.rows[0]);
    } catch (error) {
        return responderErroBanco(response, error);
    }
});

/*
|--------------------------------------------------------------------------
| Atualizar produto
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/produtos/{id}:
 *   put:
 *     summary: Atualiza um produto
 *     tags:
 *       - Produtos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProdutoRequest'
 *     responses:
 *       200:
 *         description: Produto atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProdutoResponse'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Produto não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.put('/api/produtos/:id', async (request, response) => {
    const id = Number(request.params.id);
    const { nome, preco, quantidade } = request.body;

    if (!Number.isInteger(id) || id <= 0) {
        return response.status(400).json({
            mensagem: 'O ID deve ser um número inteiro maior que zero.'
        });
    }

    const erro = validarProduto({
        nome,
        preco,
        quantidade
    });

    if (erro) {
        return response.status(400).json({
            mensagem: erro
        });
    }

    try {
        const resultado = await pool.query(`
            UPDATE produtos
            SET
                nome = $1,
                preco = $2,
                quantidade = $3,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING
                id,
                nome,
                preco::double precision AS preco,
                quantidade
        `, [
            nome.trim(),
            Number(preco),
            Number(quantidade),
            id
        ]);

        if (resultado.rowCount === 0) {
            return response.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        return response.status(200).json(resultado.rows[0]);
    } catch (error) {
        return responderErroBanco(response, error);
    }
});

/*
|--------------------------------------------------------------------------
| Excluir produto
|--------------------------------------------------------------------------
*/

/**
 * @swagger
 * /api/produtos/{id}:
 *   delete:
 *     summary: Exclui um produto
 *     tags:
 *       - Produtos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do produto
 *     responses:
 *       204:
 *         description: Produto excluído com sucesso
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Produto não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.delete('/api/produtos/:id', async (request, response) => {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return response.status(400).json({
            mensagem: 'O ID deve ser um número inteiro maior que zero.'
        });
    }

    try {
        const resultado = await pool.query(
            'DELETE FROM produtos WHERE id = $1',
            [id]
        );

        if (resultado.rowCount === 0) {
            return response.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        return response.status(204).send();
    } catch (error) {
        return responderErroBanco(response, error);
    }
});

/*
|--------------------------------------------------------------------------
| Middleware para rotas não encontradas
|--------------------------------------------------------------------------
*/

app.use((request, response) => {
    response.status(404).json({
        mensagem: 'Rota não encontrada.'
    });
});

/*
|--------------------------------------------------------------------------
| Função de validação
|--------------------------------------------------------------------------
*/

function validarProduto(produto) {
    if (
        !produto.nome ||
        typeof produto.nome !== 'string' ||
        produto.nome.trim().length < 3
    ) {
        return 'O nome deve possuir pelo menos 3 caracteres.';
    }

    const preco = Number(produto.preco);

    if (
        produto.preco === undefined ||
        produto.preco === null ||
        !Number.isFinite(preco) ||
        preco <= 0
    ) {
        return 'O preço deve ser um número maior que zero.';
    }

    const quantidade = Number(produto.quantidade);

    if (
        produto.quantidade === undefined ||
        produto.quantidade === null ||
        !Number.isInteger(quantidade) ||
        quantidade < 0
    ) {
        return 'A quantidade deve ser um número inteiro maior ou igual a zero.';
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| Tratamento de erros do PostgreSQL
|--------------------------------------------------------------------------
*/

function responderErroBanco(response, error) {
    console.error('Erro ao acessar PostgreSQL:', error);

    return response.status(500).json({
        mensagem: 'Erro interno ao acessar o banco de dados.'
    });
}

/*
|--------------------------------------------------------------------------
| Inicialização da aplicação
|--------------------------------------------------------------------------
*/

async function iniciarAplicacao() {
    try {
        await pool.query('SELECT 1');

        app.listen(PORT, '0.0.0.0', () => {
            console.log('------------------------------------------');
            console.log('API de produtos iniciada com sucesso.');
            console.log(`Porta: ${PORT}`);
            console.log(
                `PostgreSQL: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
            );
            console.log('Swagger: /swagger');
            console.log('Health check: /health');
            console.log('------------------------------------------');
        });
    } catch (error) {
        console.error(
            'Não foi possível iniciar a API porque o PostgreSQL está indisponível.'
        );

        console.error(error);

        process.exit(1);
    }
}

iniciarAplicacao();