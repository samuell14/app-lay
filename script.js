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
// --- 3. CAPTURA DE VÍDEO E FOTO (Modernizado com async/await e Troca de Câmera) ---
const video = document.querySelector('video');
const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const fotosContainer = document.querySelector('.fotos');
const btnFoto = document.querySelector('#btn-foto'); 
const btnTrocarCamera = document.querySelector('#btn-trocar-camera');

let streamAtual = null; // Guarda o fluxo de vídeo atual
let cameraModo = 'environment'; // 'environment' = Traseira | 'user' = Frontal

// Iniciar Câmera
const iniciarCamera = async () => {
    // IMPORTANTE: Para o vídeo atual antes de tentar abrir a nova câmera
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop());
    }

    const specs = { 
        video: { 
            facingMode: cameraModo,
            // Usar 'ideal' evita esticar ou distorcer a imagem no celular
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
        } 
    };
    
    try {
        streamAtual = await navigator.mediaDevices.getUserMedia(specs);
        video.srcObject = streamAtual;
        video.play();
    } catch (error) {
        console.error("Erro ao acessar a câmera:", error);
        // Se a traseira falhar (ex: rodando no PC que só tem webcam), tenta a frontal automaticamente
        if (cameraModo === 'environment') {
            cameraModo = 'user';
            iniciarCamera();
        } else {
            alert("Não foi possível acessar a câmera. Verifique as permissões.");
        }
    }
};

// Evento para trocar de câmera
btnTrocarCamera.addEventListener('click', () => {
    // Alterna o texto entre environment (traseira) e user (frontal)
    cameraModo = cameraModo === 'environment' ? 'user' : 'environment';
    iniciarCamera();
});

// Chama a função para ligar a câmera assim que o script carregar
iniciarCamera();

// Tirar Foto
btnFoto.addEventListener('click', () => {
    btnFoto.disabled = true;
    setTimeout(() => btnFoto.disabled = false, 1000);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        if (!blob) return; 

        const url = URL.createObjectURL(blob);
        const newImg = document.createElement('img');
        newImg.src = url;
        
        newImg.onload = () => URL.revokeObjectURL(url);
        fotosContainer.appendChild(newImg);

        newImg.addEventListener("click", () => {
            newImg.classList.add("img-del"); 
            
            setTimeout(() => {
                const querDeletar = confirm("Deseja realmente excluir a Imagem selecionada?");
                if (querDeletar) {
                    newImg.remove();
                } else {
                    newImg.classList.remove("img-del"); 
                }
            }, 50); 
        });
    }, 'image/jpeg', 0.9); 
});


                

      
    //Download da foto:

    // let link = document.createElement('a');
    // link.download = 'foto.png'
    // link.href = canvas.toDataURL();
    // link.textContent = 'Clique para baixar a imagem';
    // document.querySelector('.images').appendChild(link);
