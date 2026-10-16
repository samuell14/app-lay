'use strict';

let sqliteDb = null;

// --- 1. PERSISTÊNCIA COM INDEXEDDB ---
const gerenciarIndexedDB = {
    conectar: () => new Promise((resolve, reject) => {
        const request = indexedDB.open("PodologiaDatabase", 1);
        request.onupgradeneeded = (e) => e.target.result.createObjectStore("arquivos_sqlite");
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    }),
    salvar: async (uint8Array) => {
        const idb = await gerenciarIndexedDB.conectar();
        return new Promise((resolve) => {
            const tx = idb.transaction("arquivos_sqlite", "readwrite");
            tx.objectStore("arquivos_sqlite").put(uint8Array, "banco_dados");
            tx.oncomplete = () => resolve();
        });
    },
    carregar: async () => {
        const idb = await gerenciarIndexedDB.conectar();
        return new Promise((resolve) => {
            const tx = idb.transaction("arquivos_sqlite", "readonly");
            const request = tx.objectStore("arquivos_sqlite").get("banco_dados");
            request.onsuccess = () => resolve(request.result);
        });
    }
};

// --- 2. INICIALIZAÇÃO DO SQLITE ---
const iniciarBancoDeDados = async () => {
    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    const bancoSalvo = await gerenciarIndexedDB.carregar();

    if (bancoSalvo) {
        sqliteDb = new SQL.Database(bancoSalvo);
    } else {
        sqliteDb = new SQL.Database();
        sqliteDb.run(`
            CREATE TABLE clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT,
                email TEXT,
                celular TEXT,
                queixa TEXT,
                dados_form TEXT, 
                fotos TEXT
            );
        `);
        await salvarAlteracoes();
    }
    
    updateTable(); 
};

const salvarAlteracoes = async () => {
    const bancoBinario = sqliteDb.export();
    await gerenciarIndexedDB.salvar(bancoBinario);
};

// --- 3. CAPTURA DE DADOS EXTRAS E FOTOS ---
const capturarDadosDoFormulario = () => {
    const form = document.getElementById('formAvaliacao');
    const formData = new FormData(form);
    const dados = {};
    
    formData.forEach((value, key) => {
        if (dados[key]) {
            if (!Array.isArray(dados[key])) dados[key] = [dados[key]];
            dados[key].push(value);
        } else {
            dados[key] = value;
        }
    });
    return JSON.stringify(dados);
};

const capturarFotos = async () => {
    const imagens = document.querySelectorAll('.fotos img');
    const fotosBase64 = [];
    
    for (let img of imagens) {
        if (img.src.startsWith('data:')) {
            fotosBase64.push(img.src);
        } else if (img.src.startsWith('blob:')) {
            const response = await fetch(img.src);
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            fotosBase64.push(base64);
        }
    }
    return JSON.stringify(fotosBase64);
};

// --- 4. CRUD COM SQLITE ---
const readClient = () => {
    const resultados = sqliteDb.exec("SELECT * FROM clientes");
    if (resultados.length === 0) return [];
    
    const colunas = resultados[0].columns;
    const linhas = resultados[0].values;
    
    return linhas.map(linha => {
        const cliente = {};
        colunas.forEach((coluna, index) => {
            cliente[coluna] = linha[index];
        });
        return cliente;
    });
};

const createClient = async (client) => {
    sqliteDb.run(
        `INSERT INTO clientes (nome, email, celular, queixa, dados_form, fotos) VALUES (?, ?, ?, ?, ?, ?)`,
        // Garantindo que nenhuma variável passe como undefined. Se for undefined, passa string vazia "".
        [client.nome || "", client.email || "", client.celular || "", client.queixa || "", client.dados_form || "{}", client.fotos || "[]"]
    );
    await salvarAlteracoes();
};

const updateClient = async (id, client) => {
    sqliteDb.run(
        `UPDATE clientes SET nome = ?, email = ?, celular = ?, queixa = ?, dados_form = ?, fotos = ? WHERE id = ?`,
        [client.nome || "", client.email || "", client.celular || "", client.queixa || "", client.dados_form || "{}", client.fotos || "[]", id]
    );
    await salvarAlteracoes();
};

const deleteClient = async (id) => {
    sqliteDb.run(`DELETE FROM clientes WHERE id = ?`, [id]);
    await salvarAlteracoes();
};

// --- 5. INTERAÇÃO COM A INTERFACE (DOM) ---

const isValidFields = () => document.querySelector('#formAvaliacao').reportValidity();

// Função auxiliar para capturar o valor sem quebrar caso o input não exista no HTML
const obterValorSeguro = (seletor) => {
    const elemento = document.querySelector(seletor);
    return elemento ? elemento.value : "";
};

const saveClient = async () => {
    if (isValidFields()) {
        const client = {
            nome: obterValorSeguro('#nome'),
            email: obterValorSeguro('#email'), // Se não existir no HTML, retorna ""
            celular: obterValorSeguro('#celular'),
            queixa: obterValorSeguro('#main'),
            dados_form: capturarDadosDoFormulario(), 
            fotos: await capturarFotos() 
        };
        
        const id = document.querySelector('#nome').dataset.index;
        
        if (id === "new" || !id) {
            await createClient(client);
        } else {
            await updateClient(id, client);
        }
        
        updateTable();
        document.getElementById("btnFecharModal").click(); 
    }
};

const createRow = (client) => {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${client.nome}</td>
        <td>${client.queixa}</td>
        <td>
            <button type="button" class="btn btn-edit" id="edit-${client.id}">Editar</button>
            <button type="button" class="btn btn-delete" id="delete-${client.id}">Excluir</button>
        </td>
    `;
    document.querySelector("#tableClient>tbody").appendChild(newRow);
};

const clearTable = () => {
    const rows = document.querySelectorAll('#tableClient>tbody tr');
    rows.forEach(row => row.parentNode.removeChild(row));
};

const updateTable = () => {
    if (!sqliteDb) return; 
    const dbClient = readClient();
    clearTable();
    dbClient.forEach(createRow);
};

const fillFields = (client) => {
    const form = document.getElementById('formAvaliacao');
    form.reset(); 
    
    document.querySelector('#nome').dataset.index = client.id;
    
    if (document.querySelector('#nome')) document.querySelector('#nome').value = client.nome || "";
    if (document.querySelector('#email')) document.querySelector('#email').value = client.email || "";
    if (document.querySelector('#celular')) document.querySelector('#celular').value = client.celular || "";
    if (document.querySelector('#main')) document.querySelector('#main').value = client.queixa || "";
    
    if (client.dados_form) {
        const dadosExtras = JSON.parse(client.dados_form);
        Object.keys(dadosExtras).forEach(key => {
            const inputs = form.querySelectorAll(`[name="${key}"]`);
            if (inputs.length > 0) {
                const tipo = inputs[0].type;
                if (tipo === 'radio') {
                    // Radios sempre precisam ter o value especificado
                    const inputCorreto = form.querySelector(`[name="${key}"][value="${dadosExtras[key]}"]`);
                    if (inputCorreto) inputCorreto.checked = true;
                } else if (tipo === 'checkbox') {
                    // Prepara para aceitar tanto 1 checkbox quanto vários com o mesmo name (array)
                    const valores = Array.isArray(dadosExtras[key]) ? dadosExtras[key] : [dadosExtras[key]];
                    
                    valores.forEach(val => {
                        // Tenta buscar pelo name E value exato
                        let chk = form.querySelector(`[name="${key}"][value="${val}"]`);
                        
                        // Se não achar (porque no HTML não tem value definido e o JS salvou como "on" padrão)
                        if (!chk && val === "on") chk = form.querySelector(`[name="${key}"]`);
                        
                        if (chk) chk.checked = true;
                    });
                } else {
                    inputs[0].value = dadosExtras[key];
                }
            }
        });
    }

    const fotosContainer = document.querySelector('.fotos');
    fotosContainer.innerHTML = ''; 
    
    if (client.fotos && client.fotos !== "[]") {
        const fotosSalvas = JSON.parse(client.fotos);
        fotosSalvas.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            
            img.addEventListener("click", () => {
                img.classList.add("img-del");
                setTimeout(() => {
                    if (confirm("Deseja realmente excluir a Imagem selecionada?")) img.remove();
                    else img.classList.remove("img-del");
                }, 50);
            });
            
            fotosContainer.appendChild(img);
        });
    }
};

const editClient = (id) => {
    const resultado = sqliteDb.exec(`SELECT * FROM clientes WHERE id = ${id}`);
    if (resultado.length > 0) {
        const linha = resultado[0].values[0];
        const client = {
            id: linha[0], nome: linha[1], email: linha[2], celular: linha[3], 
            queixa: linha[4], dados_form: linha[5], fotos: linha[6]
        };
        fillFields(client);
        document.getElementById("modalAvaliacao").showModal();
    }
};

const editDelete = async (event) => {
    if (event.target.tagName === 'BUTTON') {
        const [action, id] = event.target.id.split('-');
        
        if (action === 'edit') {
            editClient(id);
        } else if (action === 'delete') {
            if (confirm(`Deseja realmente excluir este cliente?`)) {
                await deleteClient(id);
                updateTable();
            }
        }
    }
};

// --- 6. EVENTOS GERAIS ---
document.querySelector("#formAvaliacao").addEventListener('submit', (e) => {
    e.preventDefault(); 
    saveClient();
});

document.querySelector("#tableClient>tbody").addEventListener("click", editDelete);

// Importante: Reseta o ID para "new" e limpa imagens ao fechar o modal
document.getElementById("btnFecharModal").addEventListener("click", () => {
    document.querySelector('.fotos').innerHTML = '';
    const nomeInput = document.querySelector('#nome');
    if (nomeInput) nomeInput.dataset.index = "new"; 
});

// Importante: Reseta também ao clicar em "Novo Cliente"
document.getElementById("btnNovoCliente").addEventListener("click", () => {
    const form = document.getElementById('formAvaliacao');
    if (form) form.reset();
    document.querySelector('.fotos').innerHTML = '';
    
    const nomeInput = document.querySelector('#nome');
    if (nomeInput) nomeInput.dataset.index = "new";
});

iniciarBancoDeDados();