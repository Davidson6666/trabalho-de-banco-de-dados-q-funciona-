// Espera a página carregar completamente antes de rodar o código
document.addEventListener('DOMContentLoaded', () => {

    // Adiciona botão de edição para admin
    const loginArea = document.getElementById('login-area');
    let user = JSON.parse(localStorage.getItem('bubbleMixUser') || 'null');
    if (user && user.email === 'admin@site.com') {
        const editarBtn = document.createElement('button');
        editarBtn.textContent = 'Editar';
        editarBtn.style.marginLeft = '1rem';
        editarBtn.onclick = () => window.location.href = 'crud.html';
        loginArea.appendChild(editarBtn);
    }

    // Carrega produtos dinamicamente do CSV
    async function carregarProdutos() {
        const chaOptions = document.getElementById('cha-options');
        if (!chaOptions) return;
        try {
        // Força sempre buscar o CSV atualizado, evitando cache
        const resp = await fetch('/produtos.csv?_=' + Date.now());
            const csv = await resp.text();
            const linhas = csv.trim().split('\n');
            const header = linhas[0].split(',');
            const produtos = linhas.slice(1)
                .map(l => {
                    const vals = l.split(',');
                    // Só cria produto se todos os campos obrigatórios existem
                    if (vals.length < 5) return null;
                    return Object.fromEntries(header.map((h, i) => [h, vals[i]]));
                })
                .filter(prod => prod && prod.nome && prod.preco); // ignora inválidos
            // Limpa os produtos atuais
            chaOptions.innerHTML = '<h2>Nossos Chás</h2>';
            produtos.forEach(prod => {
                // Usa preço formatado
                const preco = Number(prod.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                // Busca o campo de estoque de forma robusta
                let estoque = 0;
                for (const key in prod) {
                    if (key.trim().toLowerCase() === 'estoque') {
                        estoque = prod[key] && !isNaN(Number(prod[key].trim())) ? Number(prod[key].trim()) : 0;
                        break;
                    }
                }
                // Busca o campo de imagem
                let imgUrl = '';
                for (const key in prod) {
                    if (key.trim().toLowerCase() === 'imagem') {
                        imgUrl = prod[key] ? prod[key].trim() : '';
                        break;
                    }
                }
                // Se não houver imagem e for um dos chás originais, usa imagem padrão
                if (!imgUrl) {
                    if (prod.nome && prod.nome.toLowerCase().includes('preto')) imgUrl = '/pngs/cha-preto.png';
                    else if (prod.nome && prod.nome.toLowerCase().includes('verde')) imgUrl = '/pngs/cha-verde.jpg';
                    else if (prod.nome && prod.nome.toLowerCase().includes('hibisco')) imgUrl = '/pngs/cha-hibi.png';
                } else {
                    // Se for base64 puro, adiciona prefixo automaticamente
                    if (/^[A-Za-z0-9+/=]+$/.test(imgUrl) && imgUrl.length > 100) {
                        // Tenta detectar tipo pelo tamanho ou pelo admin (padrão png)
                        imgUrl = 'data:image/png;base64,' + imgUrl;
                    } else if (/^base64,/.test(imgUrl)) {
                        imgUrl = 'data:image/png;' + imgUrl;
                    }
                }
                const article = document.createElement('article');
                article.className = 'cha-item';
                article.dataset.price = prod.preco;
                article.innerHTML = `
                    <h3>${prod.nome}</h3>
                    <img src="${imgUrl}" alt="${prod.nome}" width="100" style="margin-bottom:8px;display:block;">
                    <p class="price">Preço: ${preco} <span style='color:#888'>(Estoque: ${estoque})</span></p>
                    <div class="controls">
                        <label>Quantidade:</label>
                        <input type="number" min="0" value="0">
                    </div>
                    <div class="controls">
                        <label><i class="fas fa-circle"></i> Bolinhas?</label>
                        <select>
                            <option value="">Sem bolinhas</option>
                            <option value="morango">Morango</option>
                            <option value="maracuja">Maracujá</option>
                            <option value="tapioca">Tapioca</option>
                        </select>
                    </div>
                `;
                chaOptions.appendChild(article);
            });
        } catch (e) {
            // Se der erro, não faz nada
        }
    }
    carregarProdutos();

    // Pega os botões e elementos do HTML que vamos usar
    const addToCartBtn       = document.getElementById('add-to-cart-btn');      // Botão "Adicionar ao Carrinho"
    const buyNowBtn          = document.getElementById('buy-now-btn');          // Botão "Comprar Agora"
    const toast              = document.getElementById('toast');                // Caixinha que mostra avisos rápidos
    const cartKey            = 'bubbleMixCart';                                 // Nome da "chave" que usamos no localStorage
    const cartItemCountSpan  = document.getElementById('cart-item-count');      // Onde mostra quantos itens tem no carrinho
    const cartTotalPriceSpan = document.getElementById('cart-total-price');     // Onde mostra o preço total do carrinho
    const cartListUl         = document.getElementById('cart-list');            // A lista com os itens do carrinho
    const emptyCartMessage   = document.getElementById('empty-cart-message');   // Mensagem quando o carrinho estiver vazio

    // DEBUG: Verifica se os botões existem e loga no console
    if (!addToCartBtn) console.error('Botão Adicionar ao Carrinho não encontrado!');
    if (!buyNowBtn) console.error('Botão Comprar Agora não encontrado!');


    // Aqui limpa o carrinho toda vez que recarrega (só para testes mesmo)
    localStorage.removeItem(cartKey);
    updateCartPreview();  // Atualiza o número e total no topo
    displayCartItems();   // Mostra os itens na lista do carrinho

    // Função que pega os chás que o usuário escolheu
    function getSelectedItems() {
        const items = [];
        // Sempre busca os artigos de chá dinamicamente
        const chaArticles = document.querySelectorAll('#cha-options article');
        chaArticles.forEach(tea => {
            const name       = tea.querySelector('h3').textContent;
            const price      = parseFloat(tea.dataset.price);
            const qtyInput   = tea.querySelector('input[type="number"]');
            const selectBoba = tea.querySelector('select');
            const qty        = parseInt(qtyInput.value, 10);
            const sabor      = selectBoba.value;
            if (qty > 0) {
                items.push({
                    name,
                    quantity: qty,
                    price,
                    hasBoba: sabor !== '',
                    saborBoba: sabor || null
                });
            }
        });
        return items;
    }

    // Salva os itens no carrinho (no localStorage)
    function saveCart(cartItems) {
        localStorage.setItem(cartKey, JSON.stringify(cartItems)); // Salva os dados como texto
        updateCartPreview();  // Atualiza o número e total do carrinho no topo
        displayCartItems();   // Mostra os itens no carrinho
    }

     //Mostra uma mensagem rápida na tela
    function showToast(msg) {
        toast.textContent = msg;
toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000); // Some depois de 3 segundos
    }

    // Atualiza o número de itens e o total do carrinho que aparece no topo
    function updateCartPreview() {
        const stored = JSON.parse(localStorage.getItem(cartKey) || '[]'); // Pega o carrinho salvo

        const totalQty   = stored.reduce((sum, i) => sum + i.quantity, 0);         // Soma todas as quantidades
        const totalPrice = stored.reduce((sum, i) => sum + i.quantity * i.price, 0); // Soma todos os preços

        cartItemCountSpan.textContent  = totalQty;                                 // Mostra quantidade
        cartTotalPriceSpan.textContent = totalPrice.toFixed(2).replace('.', ',');  // Mostra total com vírgula
    }

     //Função para apagar o carrinho
    function clearCart() {
        localStorage.removeItem(cartKey);  // Remove os itens do localStorage
        updateCartPreview();               // Atualiza o topo
      displayCartItems();                // Atualiza a lista
    }

    // Mostra os itens que estão no carrinho na lista da página
    function displayCartItems() {
        cartListUl.innerHTML = ''; // Limpa a lista primeiro

        const stored = JSON.parse(localStorage.getItem(cartKey) || '[]'); // Pega o carrinho salvo

        // Calcula o total e mostra no resumo
        const total = stored.reduce((sum, i) => sum + i.quantity * i.price, 0);
        document.getElementById('cart-list-total')
                .textContent = total.toFixed(2).replace('.', ',');

        // Se não tiver nada no carrinho, mostra a mensagem de vazio
        if (stored.length === 0) {
            emptyCartMessage.style.display = 'block';
            return;
        }

        // Se tiver itens, esconde a mensagem
        emptyCartMessage.style.display = 'none';

        // Adiciona cada item na lista
        stored.forEach(item => {
            const subtotal = (item.price * item.quantity).toFixed(2).replace('.', ','); // Preço do item vezes a quantidade
            const bobaText = item.hasBoba
                ? ` com bolinhas de ${item.saborBoba}`   // Se tiver bolinhas, mostra o sabor
                : '';
            const li = document.createElement('li');
            li.textContent = `${item.name} (x${item.quantity})${bobaText} – R$ ${subtotal}`;
            cartListUl.appendChild(li);
        });
    }

    // Quando clicar no botão "Adicionar ao Carrinho"
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            try {
                const sel = getSelectedItems(); // Pega os chás escolhidos
                if (sel.length) {
                    saveCart(sel);  // Salva no carrinho
                    showToast('Item(ns) adicionado(s) ao carrinho!');
                } else {
                    showToast('Selecione ao menos um chá.'); // Se não escolheu nada
                }
            } catch (e) {
                console.error('Erro ao adicionar ao carrinho:', e);
                showToast('Erro ao adicionar ao carrinho. Veja o console.');
            }
        });
    }

    // Função para verificar se o usuário está logado
    function isUserLoggedIn() {
        // Checa se há um usuário logado no localStorage
        const user = JSON.parse(localStorage.getItem('bubbleMixUser') || 'null');
        return user !== null;
    }

    // Função para simular busca no CSV (apenas para exemplo, real seria backend)
    async function checkUserInCSV(email, senha) {
        try {
            const res = await fetch('/api/checkUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            const data = await res.json();
            return data.exists;
        } catch (e) {
            return false;
        }
    }

    // Função para simular cadastro (real seria backend)
    async function registerUserInCSV(user) {
        try {
            const res = await fetch('/api/registerUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('bubbleMixUser', JSON.stringify(user));
            }
        } catch (e) {
            showToast('Erro ao cadastrar usuário.');
        }
    }

    // Quando clicar no botão "Comprar Agora"
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', async () => {
            try {
                const sel = getSelectedItems(); // Pega os chás escolhidos
                if (!sel.length) {
                    showToast('Selecione ao menos um chá para comprar.');
                    return;
                }

                // Verifica se usuário está logado
                let user = JSON.parse(localStorage.getItem('bubbleMixUser') || 'null');
                if (!user) {
                    // Não logado, redireciona para login
                    window.location.href = 'login.html';
                    return;
                }

                // Checa se usuário existe no CSV (simulado)
                const exists = await checkUserInCSV(user.email, user.senha);
                if (exists) {
                    const confirmacao = confirm('Deseja realmente prosseguir para o pagamento?');
                    if (confirmacao) {
                        saveCart(sel);
                        // Envia compra para o backend
                        try {
                            // Busca produtos e usuários do CSV
                            // Força sempre buscar o CSV atualizado, evitando cache
                            const produtosResp = await fetch('/produtos.csv?_=' + Date.now());
                            const produtosCsvText = await produtosResp.text();
                            const produtosLinhas = produtosCsvText.trim().split('\n');
                            const produtosHeader = produtosLinhas[0].split(',');
                            const produtosArr = produtosLinhas.slice(1).map(l => {
                                const vals = l.split(',');
                                return Object.fromEntries(produtosHeader.map((h, i) => [h, vals[i]]));
                            });
                    // Função para normalizar nomes (remove acentos, espaços e deixa minúsculo)
                    function normalize(str) {
                        return (str || '').normalize('NFD').replace(/[^\w]/g, '').toLowerCase();
                    }
                    // Mapeia nome normalizado -> id
                    const nomeToId = {};
                    produtosArr.forEach(p => {
                        nomeToId[normalize(p.nome)] = p.id;
                    });
                    const idsProdutos = sel.map(item => {
                        const id = nomeToId[normalize(item.name)];
                        if (!id) {
                            console.warn('Produto não encontrado para o nome:', item.name, 'normalizado:', normalize(item.name));
                        }
                        return id || '';
                    });
                            const quantidades = sel.map(item => item.quantity);
                            // Busca id do usuário pelo email
                            const usuariosResp = await fetch('/usuarios.csv');
                            const usuariosCsvText = await usuariosResp.text();
                            const usuariosLinhas = usuariosCsvText.trim().split('\n');
                            const usuariosHeader = usuariosLinhas[0].split(',');
                            const usuariosArr = usuariosLinhas.slice(1).map(l => {
                                const vals = l.split(',');
                                return Object.fromEntries(usuariosHeader.map((h, i) => [h, vals[i]]));
                            });
                            let userId = '';
                            const usuario = usuariosArr.find(u => u.email === user.email);
                            if (usuario) userId = usuario.id;
                            // Data/hora atual
                            const data = new Date().toISOString();
                            const resp = await fetch('/api/registerPurchase', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId,
                                    idsProdutos,
                                    quantidades,
                                    data
                                })
                            });
                            if (!resp.ok) {
                                const err = await resp.json();
                                showToast(err.error || 'Erro ao registrar compra.');
                                return;
                            }
                        } catch (e) {
                            showToast('Erro ao registrar compra.');
                            console.error('Erro ao registrar compra:', e);
                            return;
                        }
                        window.location.href = 'payment.html';
                    }
                } else {
                    // Usuário não existe no CSV, pede cadastro
                    const nome = prompt('Digite seu nome para cadastro:');
                    const email = prompt('Digite seu email:');
                    const senha = prompt('Digite uma senha:');
                    if (nome && email && senha) {
                        const novoUser = { nome, email, senha };
                        await registerUserInCSV(novoUser);
                        showToast('Cadastro realizado! Agora você pode comprar.');
                        // Após cadastro, salva carrinho e vai para pagamento
                        saveCart(sel);
                        window.location.href = 'payment.html';
                    } else {
                        showToast('Cadastro cancelado.');
                    }
                }
            } catch (e) {
                console.error('Erro no fluxo de compra:', e);
                showToast('Erro inesperado ao comprar. Veja o console.');
            }
        });
    }
});
