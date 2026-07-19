const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = 3000;

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Cache em memória
|--------------------------------------------------------------------------
| Os dados serão perdidos quando a aplicação for reiniciada.
*/

let proximoId = 4;

const produtos = [
    {
        id: 1,
        nome: 'Notebook Dell',
        preco: 4500.00,
        quantidade: 10
    },
    {
        id: 2,
        nome: 'Mouse Logitech',
        preco: 150.00,
        quantidade: 25
    },
    {
        id: 3,
        nome: 'Teclado Mecânico',
        preco: 350.00,
        quantidade: 15
    }
];

/*
|--------------------------------------------------------------------------
| Configuração do Swagger
|--------------------------------------------------------------------------
*/

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Produtos',
            version: '1.0.0',
            description: 'API REST de produtos utilizando Node.js, Express e cache em memória'
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Servidor local'
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
    apis: ['./index.js']
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
 */
app.get('/', (request, response) => {
    response.status(200).json({
        mensagem: 'API de produtos em funcionamento.',
        documentacao: `http://localhost:${PORT}/swagger`
    });
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
 */
app.get('/api/produtos', (request, response) => {
    response.status(200).json(produtos);
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
 *       404:
 *         description: Produto não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
app.get('/api/produtos/:id', (request, response) => {
    const id = Number(request.params.id);

    const produto = produtos.find(
        produto => produto.id === id
    );

    if (!produto) {
        return response.status(404).json({
            mensagem: 'Produto não encontrado.'
        });
    }

    response.status(200).json(produto);
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
app.post('/api/produtos', (request, response) => {
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

    const produto = {
        id: proximoId++,
        nome: nome.trim(),
        preco: Number(preco),
        quantidade: Number(quantidade)
    };

    produtos.push(produto);

    response.status(201).json(produto);
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
 */
app.put('/api/produtos/:id', (request, response) => {
    const id = Number(request.params.id);
    const { nome, preco, quantidade } = request.body;

    const indice = produtos.findIndex(
        produto => produto.id === id
    );

    if (indice === -1) {
        return response.status(404).json({
            mensagem: 'Produto não encontrado.'
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

    produtos[indice] = {
        id,
        nome: nome.trim(),
        preco: Number(preco),
        quantidade: Number(quantidade)
    };

    response.status(200).json(produtos[indice]);
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
 *       404:
 *         description: Produto não encontrado
 */
app.delete('/api/produtos/:id', (request, response) => {
    const id = Number(request.params.id);

    const indice = produtos.findIndex(
        produto => produto.id === id
    );

    if (indice === -1) {
        return response.status(404).json({
            mensagem: 'Produto não encontrado.'
        });
    }

    produtos.splice(indice, 1);

    response.status(204).send();
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
| Inicialização da aplicação
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
    console.log(`API executando em: http://localhost:${PORT}`);
    console.log(`Swagger disponível em: http://localhost:${PORT}/swagger`);
});