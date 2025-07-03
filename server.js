console.log('Iniciando o servidor...');
process.on('uncaughtException', function (err) {
  console.error('Exceção não tratada:', err);
});
process.on('unhandledRejection', function (reason, promise) {
  console.error('Promise rejeitada não tratada:', reason);
});


const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const app = express();
const PORT = 3000;
const comprasCsvPath = path.join(__dirname, 'compras.csv');

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'pngs'));
  },
  filename: function (req, file, cb) {
    // Garante nome único
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, base + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage: storage });

app.use(bodyParser.json());
// Servir arquivos estáticos das pastas html, js, css e pngs
app.use(express.static(path.join(__dirname, 'html')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/pngs', express.static(path.join(__dirname, 'pngs')));

// CRUD Produtos - Adicionar, Editar, Excluir
const produtosCsvPath = path.join(__dirname, 'produtos.csv');
app.get('/produtos.csv', (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.sendFile(produtosCsvPath);
});
app.post('/api/produtos/add', (req, res) => {
    try {
        const { nome, descricao, preco, estoque, imagem } = req.body;
        console.log('Recebido novo produto:', req.body);
        if (!nome || !descricao || !preco || estoque === undefined) {
            console.error('Campos obrigatórios faltando:', req.body);
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }
        fs.readFile(produtosCsvPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Erro ao ler produtos:', err);
                return res.status(500).json({ error: 'Erro ao ler produtos.' });
            }
            try {
                const linhas = data.trim().split('\n').filter(l => l.trim() !== '');
                const last = linhas[linhas.length - 1];
                let lastId = 0;
                if (last && !last.startsWith('id,')) lastId = parseInt(last.split(',')[0]) || 0;
                // Sanitiza campos para evitar quebras de CSV
                const safeNome = String(nome).replace(/\n|,/g, ' ');
                const safeDesc = String(descricao).replace(/\n|,/g, ' ');
                const safePreco = String(preco).replace(/\n|,/g, ' ');
                const safeEstoque = String(estoque).replace(/\n|,/g, ' ');
                const safeImagem = imagem ? String(imagem).replace(/\n|,/g, ' ') : '';
                const novoId = lastId + 1;
                const novaLinha = `\n${novoId},${safeNome},${safeDesc},${safePreco},${safeEstoque},${safeImagem}`;
                console.log('Linha a adicionar:', novaLinha);
                fs.appendFile(produtosCsvPath, novaLinha, err2 => {
                    if (err2) {
                        console.error('Erro ao adicionar produto:', err2);
                        return res.status(500).json({ error: 'Erro ao adicionar produto.' });
                    }
                    console.log('Produto adicionado com sucesso!');
                    res.json({ success: true });
                });
            } catch (e) {
                console.error('Erro inesperado ao processar produto:', e);
                return res.status(500).json({ error: 'Erro inesperado ao processar produto.' });
            }
        });
    } catch (e) {
        console.error('Erro inesperado no endpoint /api/produtos/add:', e);
        return res.status(500).json({ error: 'Erro inesperado no endpoint.' });
    }
});
app.post('/api/produtos/edit', (req, res) => {
    const { id, nome, descricao, preco, estoque, imagem } = req.body;
    if (!id || !nome || !descricao || !preco || estoque === undefined) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    fs.readFile(produtosCsvPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Erro ao ler produtos.' });
        const linhas = data.trim().split('\n').filter(l => l.trim() !== '');
        const header = linhas[0];
        const novas = linhas.map(l => {
            const campos = l.split(',');
            if (campos[0] === String(id)) {
                // Sanitiza campos para evitar quebras de CSV
                const safeNome = String(nome).replace(/\n|,/g, ' ');
                const safeDesc = String(descricao).replace(/\n|,/g, ' ');
                const safePreco = String(preco).replace(/\n|,/g, ' ');
                const safeEstoque = String(estoque).replace(/\n|,/g, ' ');
                const safeImagem = imagem ? String(imagem).replace(/\n|,/g, ' ') : '';
                return `${id},${safeNome},${safeDesc},${safePreco},${safeEstoque},${safeImagem}`;
            }
            return l;
        });
        fs.writeFile(produtosCsvPath, novas.join('\n'), err2 => {
            if (err2) return res.status(500).json({ error: 'Erro ao editar produto.' });
            res.json({ success: true });
        });
    });
});
app.post('/api/produtos/delete', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID obrigatório.' });
    fs.readFile(produtosCsvPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Erro ao ler produtos.' });
        const linhas = data.trim().split('\n').filter(l => l.trim() !== '');
        const header = linhas[0];
        const novas = linhas.filter(l => l.split(',')[0] !== String(id));
        fs.writeFile(produtosCsvPath, novas.join('\n'), err2 => {
            if (err2) return res.status(500).json({ error: 'Erro ao excluir produto.' });
            res.json({ success: true });
        });
    });
});

// CRUD Usuários - Adicionar, Editar, Excluir
const usuariosCsvPath = path.join(__dirname, 'usuarios.csv');
app.get('/usuarios.csv', (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.sendFile(usuariosCsvPath);
});
app.post('/api/usuarios/add', (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    fs.readFile(usuariosCsvPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Erro ao ler usuários.' });
        const linhas = data.trim().split('\n').filter(l => l.trim() !== '');
        const last = linhas[linhas.length - 1];
        let lastId = 0;
        if (last && !last.startsWith('id,')) lastId = parseInt(last.split(',')[0]) || 0;
        // Sanitiza campos para evitar quebras de CSV
        const safeNome = String(nome).replace(/\n|,/g, ' ');
        const safeEmail = String(email).replace(/\n|,/g, ' ');
        const safeSenha = String(senha).replace(/\n|,/g, ' ');
        const novoId = lastId + 1;
        const novaLinha = `\n${novoId},${safeNome},${safeEmail},${safeSenha}`;
        fs.appendFile(usuariosCsvPath, novaLinha, err2 => {
            if (err2) return res.status(500).json({ error: 'Erro ao adicionar usuário.' });
            res.json({ success: true });
        });
    });
});
app.post('/api/usuarios/edit', (req, res) => {
    const { id, nome, email, senha } = req.body;
    if (!id || !nome || !email || !senha) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    fs.readFile(usuariosCsvPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Erro ao ler usuários.' });
        const linhas = data.trim().split('\n').filter(l => l.trim() !== '');
        const header = linhas[0];
        const novas = linhas.map(l => {
            const campos = l.split(',');
            if (campos[0] === String(id)) {
                // Sanitiza campos para evitar quebras de CSV
                const safeNome = String(nome).replace(/\n|,/g, ' ');
                const safeEmail = String(email).replace(/\n|,/g, ' ');
                const safeSenha = String(senha).replace(/\n|,/g, ' ');
                return `${id},${safeNome},${safeEmail},${safeSenha}`;
            }
            return l;
        });
        fs.writeFile(usuariosCsvPath, novas.join('\n'), err2 => {
            if (err2) return res.status(500).json({ error: 'Erro ao editar usuário.' });
            res.json({ success: true });
        });
    });
});
app.post('/api/usuarios/delete', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID obrigatório.' });
    fs.readFile(usuariosCsvPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Erro ao ler usuários.' });
        const linhas = data.trim().split('\n').filter(l => l.trim() !== '');
        const header = linhas[0];
        const novas = linhas.filter(l => l.split(',')[0] !== String(id));
        fs.writeFile(usuariosCsvPath, novas.join('\n'), err2 => {
            if (err2) return res.status(500).json({ error: 'Erro ao excluir usuário.' });
            res.json({ success: true });
        });
    });
});

// Redirecionar '/' para 'index.html'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

// Checar usuário no CSV
app.post('/api/checkUser', (req, res) => {
    const { email, senha } = req.body;
    fs.readFile(usuariosCsvPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Erro ao ler o arquivo.' });
        const linhas = data.split('\n').slice(1); // Ignora cabeçalho
        const existe = linhas.some(linha => {
            if (!linha.trim()) return false; // ignora linha vazia
            const [id, nome, csvEmail, csvSenha] = linha.split(',').map(s => s && s.trim());
            if (!csvEmail || !csvSenha) return false;
            return csvEmail.toLowerCase() === email.trim().toLowerCase() && csvSenha === senha.trim();
        });
        res.json({ exists: existe });
    });
});

// Cadastrar novo usuário no CSV
app.post('/api/registerUser', (req, res) => {
    const { nome, email, senha } = req.body;
    fs.readFile(usuariosCsvPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Erro ao ler o arquivo.' });
        // Filtra linhas não vazias e ignora cabeçalho
        const linhas = data.trim().split('\n').filter(l => l.trim() !== '' && !l.startsWith('id,'));
        let lastId = 0;
        if (linhas.length > 0) {
            const lastLine = linhas[linhas.length - 1];
            const idStr = lastLine.split(',')[0];
            lastId = parseInt(idStr) || 0;
        }
        const novoId = lastId + 1;
        const novaLinha = `\n${novoId},${nome},${email},${senha}`;
        fs.appendFile(usuariosCsvPath, novaLinha, (err) => {
            if (err) {
                console.error('Erro ao salvar usuário:', err);
                return res.status(500).json({ error: 'Erro ao salvar usuário: ' + err.message });
            }
            res.json({ success: true });
        });
    });
});

// Nova rota para registrar compra de forma organizada
app.post('/api/registerPurchase', (req, res) => {
    const { userId, idsProdutos, quantidades, data } = req.body;
    if (!userId || !idsProdutos || !quantidades || !data) {
        return res.status(400).json({ error: 'Todos os campos da compra são obrigatórios.' });
    }
    // Lê usuários e produtos do CSV
    fs.readFile(usuariosCsvPath, 'utf8', (errU, dataU) => {
        if (errU) return res.status(500).json({ error: 'Erro ao ler usuários.' });
        const usuarios = dataU.trim().split('\n').slice(1).map(l => {
            const [id, nome, email, senha] = l.split(',');
            return { id, nome };
        });
        fs.readFile(produtosCsvPath, 'utf8', (errP, dataP) => {
            if (errP) return res.status(500).json({ error: 'Erro ao ler produtos.' });
            const linhasProdutos = dataP.trim().split('\n');
            // Normaliza header para garantir que não haja espaços ou \r
            const header = linhasProdutos[0].split(',').map(h => h.trim().replace(/\r/g, '').toLowerCase());
            let produtos = linhasProdutos.slice(1)
                .map(l => {
                    if (!l.trim()) return null;
                    const vals = l.split(',');
                    if (vals.length < 5) return null;
                    // Garante que as chaves estejam normalizadas
                    return Object.fromEntries(header.map((h, i) => [h, vals[i] ? vals[i].trim() : '']));
                })
                .filter(prod => prod && prod.id && prod.nome);

            // Verifica estoque suficiente (parse robusto, impede estoque negativo)
            for (let i = 0; i < idsProdutos.length; i++) {
                const prodId = String(idsProdutos[i]);
                const qtd = parseInt(quantidades[i], 10) || 0;
                const produto = produtos.find(p => String(p.id) === prodId);
                if (!produto) {
                    console.error(`[ERRO] Produto com id ${prodId} não encontrado no CSV.`);
                    return res.status(400).json({ error: `Produto com id ${prodId} não encontrado.` });
                }
                // Busca o campo de estoque de forma robusta (independente de capitalização)
                let estoqueStr = '';
                for (const key in produto) {
                    if (key.trim().toLowerCase() === 'estoque') {
                        estoqueStr = produto[key];
                        break;
                    }
                }
                estoqueStr = (estoqueStr || '').toString().replace(/[^0-9-]/g, '');
                let estoqueAtual = parseInt(estoqueStr, 10);
                if (isNaN(estoqueAtual) || estoqueAtual < 0) estoqueAtual = 0;
                console.log(`[CHECK] Produto: ${produto.nome}, Estoque lido: '${estoqueStr}', Estoque parseado: ${estoqueAtual}, Qtd solicitada: ${qtd}`);
                if (qtd > estoqueAtual) {
                    console.error(`[ERRO ESTOQUE] Produto: ${produto.nome}, Estoque disponível: ${estoqueAtual}, Qtd solicitada: ${qtd}`);
                    return res.status(400).json({ error: `Estoque insuficiente para o produto ${produto.nome}. Disponível: ${estoqueAtual}` });
                }
            }

            // Atualiza o estoque dos produtos comprados (impede estoque negativo)
            produtos = produtos.map(prod => {
                const idx = idsProdutos.findIndex(id => String(id) === String(prod.id));
                if (idx !== -1) {
                    const qtd = parseInt(quantidades[idx], 10) || 0;
                    // Busca o campo de estoque de forma robusta
                    let estoqueStr = '';
                    for (const key in prod) {
                        if (key.trim().toLowerCase() === 'estoque') {
                            estoqueStr = prod[key];
                            break;
                        }
                    }
                    estoqueStr = (estoqueStr || '').toString().replace(/[^0-9-]/g, '');
                    let estoqueAtual = parseInt(estoqueStr, 10);
                    if (isNaN(estoqueAtual) || estoqueAtual < 0) estoqueAtual = 0;
                    let novoEstoque = estoqueAtual - qtd;
                    if (novoEstoque < 0) novoEstoque = 0;
                    console.log(`[UPDATE] Produto: ${prod.nome}, Estoque antes: ${estoqueAtual}, Qtd comprada: ${qtd}, Estoque depois: ${novoEstoque}`);
                    return { ...prod, estoque: String(novoEstoque) };
                }
                return prod;
            });

            // Salva a compra e atualiza o CSV de produtos
            fs.readFile(comprasCsvPath, 'utf8', (err, fileData) => {
                let lastId = 0;
                if (!err && fileData) {
                    const linhas = fileData.trim().split('\n').filter(l => l.trim() !== '' && !l.startsWith('id_compra,'));
                    if (linhas.length > 0) {
                        const lastLine = linhas[linhas.length - 1];
                        const idStr = lastLine.split(',')[0];
                        lastId = parseInt(idStr) || 0;
                    }
                }
                const novoId = lastId + 1;
                let novasLinhas = '';
                idsProdutos.forEach((prodId, idx) => {
                    const usuario = usuarios.find(u => String(u.id) === String(userId));
                    const nomeUsuario = usuario ? usuario.nome : '';
                    const produto = produtos.find(p => String(p.id) === String(prodId));
                    const nomeProduto = produto ? produto.nome : '';
                    const quantidade = quantidades[idx] || '';
                    novasLinhas += `\n${novoId},${userId},${nomeUsuario},${nomeProduto},${quantidade},${data}`;
                });
                const headerCompra = 'id_compra,id_usuario,nome_usuario,produto,quantidade,data';
                // Atualiza o CSV de produtos na ordem correta
                const headerProdutos = ['id','nome','descricao','preco','estoque'];
                const novasLinhasProdutos = [headerProdutos.join(',')]
                    .concat(produtos.map(p => headerProdutos.map(h => p[h]).join(',')))
                    .join('\n');

                // Reforço: faz flush do arquivo antes de responder
                fs.writeFile(produtosCsvPath, novasLinhasProdutos, err3 => {
                    if (err3) {
                        console.error('Erro ao atualizar produtos.csv:', err3);
                        return res.status(500).json({ error: 'Erro ao atualizar estoque: ' + err3.message });
                    }
                    // Tenta forçar flush do arquivo, mas com try/catch para evitar crash
                    try {
                        const fd = fs.openSync(produtosCsvPath, 'r+');
                        fs.fsync(fd, (errFsync) => {
                            try { fs.closeSync(fd); } catch (e) { console.error('Erro ao fechar fd:', e); }
                            if (errFsync) {
                                console.error('Erro ao forçar flush do produtos.csv:', errFsync);
                            }
                            // Continua normalmente
                            if (err && err.code === 'ENOENT') {
                                fs.writeFile(comprasCsvPath, headerCompra + novasLinhas, (err2) => {
                                    if (err2) {
                                        console.error('Erro ao salvar compra:', err2);
                                        return res.status(500).json({ error: 'Erro ao salvar compra: ' + err2.message });
                                    }
                                    console.log('Compra registrada e estoque atualizado com sucesso!');
                                    res.json({ success: true });
                                });
                            } else {
                                let conteudo = fileData;
                                if (!fileData.startsWith(headerCompra)) {
                                    const linhas = fileData.split('\n');
                                    linhas[0] = headerCompra;
                                    conteudo = linhas.join('\n');
                                }
                                fs.appendFile(comprasCsvPath, novasLinhas, (err2) => {
                                    if (err2) {
                                        console.error('Erro ao salvar compra:', err2);
                                        return res.status(500).json({ error: 'Erro ao salvar compra: ' + err2.message });
                                    }
                                    console.log('Compra registrada e estoque atualizado com sucesso!');
                                    res.json({ success: true });
                                });
                            }
                        });
                    } catch (e) {
                        console.error('Erro ao abrir/sincronizar produtos.csv:', e);
                        // Mesmo se der erro, continua fluxo normal
                        if (err && err.code === 'ENOENT') {
                            fs.writeFile(comprasCsvPath, headerCompra + novasLinhas, (err2) => {
                                if (err2) {
                                    console.error('Erro ao salvar compra:', err2);
                                    return res.status(500).json({ error: 'Erro ao salvar compra: ' + err2.message });
                                }
                                console.log('Compra registrada e estoque atualizado com sucesso!');
                                res.json({ success: true });
                            });
                        } else {
                            let conteudo = fileData;
                            if (!fileData.startsWith(headerCompra)) {
                                const linhas = fileData.split('\n');
                                linhas[0] = headerCompra;
                                conteudo = linhas.join('\n');
                            }
                            fs.appendFile(comprasCsvPath, novasLinhas, (err2) => {
                                if (err2) {
                                    console.error('Erro ao salvar compra:', err2);
                                    return res.status(500).json({ error: 'Erro ao salvar compra: ' + err2.message });
                                }
                                console.log('Compra registrada e estoque atualizado com sucesso!');
                                res.json({ success: true });
                            });
                        }
                    }
                });
            });
        });
    });
});


app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Servidor Express está ativo e aguardando requisições.');
});

// Mantém o processo vivo (workaround para ambientes que finalizam o Node cedo)
setInterval(() => {}, 1000 * 60 * 60);


process.on('exit', (code) => {
  console.log('Processo finalizado com código:', code);
});
