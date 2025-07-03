// CRUD Admin JS - BubbleMix

document.addEventListener('DOMContentLoaded', () => {
  // Checa se admin está logado
  const user = JSON.parse(localStorage.getItem('bubbleMixUser') || 'null');
  if (!user || user.email !== 'admin@site.com') {
    alert('Acesso restrito!');
    window.location.href = 'index.html';
    return;
  }

  // Função utilitária para criar elementos
  function el(tag, props = {}, ...children) {
    const e = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => e[k] = v);
    children.forEach(c => e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
  }

  // CRUD Produtos
  function renderProdutos() {
    fetch('/produtos.csv').then(r => r.text()).then(csv => {
      const linhas = csv.trim().split('\n');
      const header = linhas[0].split(',');
      const produtos = linhas.slice(1)
        .map(l => {
          if (!l.trim()) return null;
          const vals = l.split(',');
          if (vals.length < 5) return null;
          return Object.fromEntries(header.map((h, i) => [h, vals[i]]));
        })
        .filter(prod => prod && prod.id && prod.nome);
      const div = document.getElementById('produtos-crud');
      div.innerHTML = '';
      const table = el('table', { className: 'crud-table' });
      const thead = el('thead', {}, el('tr', {}, ...header.map(h => el('th', {}, h)), el('th', {}, 'Ações')));
      const tbody = el('tbody');
      produtos.forEach(prod => {
        const tr = el('tr', {});
        header.forEach(h => tr.appendChild(el('td', {}, prod[h])));
        // Botões editar/excluir
        const tdAcoes = el('td');
        const btnEdit = el('button', { innerText: 'Editar', onclick: () => editarProduto(prod) });
        const btnDel = el('button', { innerText: 'Excluir', onclick: () => excluirProduto(prod.id) });
        tdAcoes.appendChild(btnEdit);
        tdAcoes.appendChild(btnDel);
        tr.appendChild(tdAcoes);
        tbody.appendChild(tr);
      });
      // Botão adicionar
      const btnAdd = el('button', { innerText: 'Adicionar Produto', onclick: novoProduto });
      div.appendChild(btnAdd);
      table.appendChild(thead);
      table.appendChild(tbody);
      div.appendChild(table);
    });
  }

  // CRUD Usuários
  function renderUsuarios() {
    fetch('/usuarios.csv').then(r => r.text()).then(csv => {
      const linhas = csv.trim().split('\n');
      const header = linhas[0].split(',');
      const usuarios = linhas.slice(1).map(l => {
        const vals = l.split(',');
        return Object.fromEntries(header.map((h, i) => [h, vals[i]]));
      });
      const div = document.getElementById('usuarios-crud');
      div.innerHTML = '';
      const table = el('table', { className: 'crud-table' });
      const thead = el('thead', {}, el('tr', {}, ...header.map(h => el('th', {}, h)), el('th', {}, 'Ações')));
      const tbody = el('tbody');
      usuarios.forEach(user => {
        const tr = el('tr', {});
        header.forEach(h => tr.appendChild(el('td', {}, user[h])));
        // Botões editar/excluir
        const tdAcoes = el('td');
        const btnEdit = el('button', { innerText: 'Editar', onclick: () => editarUsuario(user) });
        const btnDel = el('button', { innerText: 'Excluir', onclick: () => excluirUsuario(user.id) });
        tdAcoes.appendChild(btnEdit);
        tdAcoes.appendChild(btnDel);
        tr.appendChild(tdAcoes);
        tbody.appendChild(tr);
      });
      // Botão adicionar
      const btnAdd = el('button', { innerText: 'Adicionar Usuário', onclick: novoUsuario });
      div.appendChild(btnAdd);
      table.appendChild(thead);
      table.appendChild(tbody);
      div.appendChild(table);
    });
  }

  // Placeholders para editar/adicionar/excluir (backend deve ser implementado)

  // PRODUTOS
  function editarProduto(prod) {
    abrirModalProduto('Editar Produto', prod);
  }
  function excluirProduto(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      fetch('/api/produtos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      }).then(() => renderProdutos());
    }
  }
  function novoProduto() {
    abrirModalProduto('Novo Produto');
  }

  // Modal de produto (adicionar/editar)
  function abrirModalProduto(titulo, prod = {}) {
    const modal = document.getElementById('modal-produto');
    const form = document.getElementById('form-produto');
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('produto-id').value = prod.id || '';
    document.getElementById('produto-nome').value = prod.nome || '';
    document.getElementById('produto-desc').value = prod.descricao || '';
    document.getElementById('produto-preco').value = prod.preco || '';
    document.getElementById('produto-estoque').value = prod.estoque || '';
    document.getElementById('produto-img').value = '';
    const preview = document.getElementById('preview-img');
    if (prod.imagem && prod.imagem.startsWith('data:image')) {
      preview.src = prod.imagem;
      preview.style.display = 'block';
    } else {
      preview.src = '';
      preview.style.display = 'none';
    }
    modal.style.display = 'flex';

    // Cancelar
    document.getElementById('btn-cancelar').onclick = () => {
      modal.style.display = 'none';
    };

    // Preview da imagem
    document.getElementById('produto-img').onchange = function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          preview.src = ev.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        preview.src = '';
        preview.style.display = 'none';
      }
    };

    // Salvar
    form.onsubmit = function(ev) {
      ev.preventDefault();
      const id = document.getElementById('produto-id').value;
      const nome = document.getElementById('produto-nome').value;
      const descricao = document.getElementById('produto-desc').value;
      const preco = document.getElementById('produto-preco').value;
      const estoque = document.getElementById('produto-estoque').value;
      let imagem = '';
      if (nome && descricao && preco && estoque) {
        if (!id) { // NOVO PRODUTO
          const body = { nome, descricao, preco, estoque, imagem };
          fetch('/api/produtos/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }).then(() => {
            modal.style.display = 'none';
            renderProdutos();
          });
        } else { // EDIÇÃO
          if (!imagem && prod.imagem) imagem = prod.imagem;
          const body = { id, nome, descricao, preco, estoque, imagem };
          fetch('/api/produtos/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }).then(() => {
            modal.style.display = 'none';
            renderProdutos();
          });
        }
      }
    };
  }

  // USUÁRIOS
  function editarUsuario(user) {
    const nome = prompt('Nome:', user.nome);
    const email = prompt('Email:', user.email);
    const senha = prompt('Senha:', user.senha);
    if (nome && email && senha) {
      fetch('/api/usuarios/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, nome, email, senha })
      }).then(() => renderUsuarios());
    }
  }
  function excluirUsuario(id) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      fetch('/api/usuarios/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      }).then(() => renderUsuarios());
    }
  }
  function novoUsuario() {
    const nome = prompt('Nome do usuário:');
    const email = prompt('Email:');
    const senha = prompt('Senha:');
    if (nome && email && senha) {
      fetch('/api/usuarios/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha })
      }).then(() => renderUsuarios());
    }
  }

  renderProdutos();
  renderUsuarios();
});
