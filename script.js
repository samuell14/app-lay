// --- 1. CONTROLE DO MODAL ---
const btnAdd = document.getElementById("btnNovoCliente");
const modal = document.getElementById("modalAvaliacao");
const closeModal = document.getElementById("btnFecharModal");
const btnCancelar = document.getElementById("btnCancelar");
const formAvaliacao = document.getElementById("formAvaliacao");

const clearFields = () => {
    if(formAvaliacao) formAvaliacao.reset(); 
};

const openModal = () => modal.showModal();

const closerModal = () => {
    clearFields(); 
    modal.close(); 
};

btnAdd.addEventListener('click', openModal);
closeModal.addEventListener('click', closerModal);
btnCancelar.addEventListener('click', closerModal);

// --- 2. FILTRO DE PESQUISA (Refatorado e Otimizado) ---
const inputBusca = document.querySelector(".input-busca");

// Uso do evento 'input' é melhor que 'keyup' pois captura colar com mouse (Ctrl+V)
inputBusca.addEventListener('input', (event) => {
    const expressao = event.target.value.toLowerCase().trim();
    
    // Seleciona todas as linhas (tr) dentro do corpo da tabela (tbody)
    const linhas = document.querySelectorAll('.tabela-clientes tr');

    linhas.forEach(linha => {
        // Se o campo estiver vazio ou a linha contiver a expressão, exibe. Se não, oculta.
        const conteudoDaLinha = linha.textContent.toLowerCase(); // textContent é mais seguro e rápido que innerHTML
        
        if (expressao === "" || conteudoDaLinha.includes(expressao)) {
            linha.style.display = '';
        } else {
            linha.style.display = 'none';
        }
    });
});

// --- 3. CAPTURA DE VÍDEO E FOTO (Modernizado com async/await) ---
const video = document.querySelector('video');
const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const fotosContainer = document.querySelector('.fotos');
const btnFoto = document.querySelector('#btn-foto'); // Se mudou o nome da classe, ajuste aqui

// Iniciar Câmera
const iniciarCamera = async () => {
    const specs = { video: { width: 320, height: 200 } };
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia(specs);
        video.srcObject = stream;
        video.play();
    } catch (error) {
        console.error("Erro ao acessar a câmera:", error);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
};

// Chama a função para ligar a câmera assim que o script carregar
iniciarCamera();

// Tirar Foto
btnFoto.addEventListener('click', () => {
    // Configura o tamanho do canvas para o tamanho do vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Desenha o frame atual do vídeo no canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converte o canvas para Blob (melhor performance que base64/toDataURL)
    canvas.toBlob((blob) => {
        if (!blob) return; // Segurança

        const url = URL.createObjectURL(blob);
        const newImg = document.createElement('img');
        newImg.src = url;
        
        // Limpa a URL da memória assim que a imagem for carregada
        newImg.onload = () => URL.revokeObjectURL(url);

        // Adiciona a imagem na tela
        fotosContainer.appendChild(newImg);

        // Evento para deletar a imagem
        newImg.addEventListener("click", () => {
            newImg.classList.add("img-del"); // Adiciona borda vermelha, por exemplo
            
            // Pequeno atraso (opcional) para o usuário ver a borda antes do alerta
            setTimeout(() => {
                const querDeletar = confirm("Deseja realmente excluir a Imagem selecionada?");
                if (querDeletar) {
                    newImg.remove();
                } else {
                    newImg.classList.remove("img-del"); 
                }
            }, 50); 
        });
    }, 'image/jpeg', 0.9); // Opcional: Define formato e qualidade da foto
});


                

      
    //Download da foto:

    // let link = document.createElement('a');
    // link.download = 'foto.png'
    // link.href = canvas.toDataURL();
    // link.textContent = 'Clique para baixar a imagem';
    // document.querySelector('.images').appendChild(link);
