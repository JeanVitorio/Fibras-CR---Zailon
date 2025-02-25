const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Chatbot de vendas de Piscinas e Barcos conectado!');
});

client.initialize();

let respostaSimNaoPedido = '';
let pedidos = {};
let conversaEstado = {}; // Para controlar o estado da conversa do cliente

// Cardápio de categorias de produtos
const categorias = {
    "B": "Barcos",
    "P": "Piscinas"
};

// Cardápio de produtos
const produtos = {
    "B": [
        { nome: "Barco de 4.60m", preco: 3300, imagem: "./Criativos/Barco_4.60/frente_direita.jpeg" },
        { nome: "Barco de 3m", preco: 2000, imagem: "./Criativos/Barco_3m/frente_cinza.jpeg" },
        { nome: "Barco estilo Canoa 4m", preco: 2500, imagem: "./Criativos/Barco_estilo_canoa_4m/frente.jpeg" }
    ],
    "P": [
        { nome: "Piscina 3x6x1.30", preco: null, imagem: "./Criativos/Piscina_3X6X1.30/frente.jpeg" },
        { nome: "Piscina estilo retrô 2,40x4x1.30", preco: null, imagem: "./Criativos/Piscina_estilo_retro_2,40X4X1.30/lado01.jpeg" }
    ]
};

// Função que envia as imagens de um produto
async function enviarImagemProduto(chatId, produto) {
    const media = MessageMedia.fromFilePath(produto.imagem);
    await client.sendMessage(chatId, media, { caption: produto.nome });
}

client.on('message', async msg => {
    const chatId = msg.from;
    const mensagem = msg.body.trim().toLowerCase();

    // Se o atendente enviar "finalizado", reseta o atendimento
    if (mensagem === 'finalizado') {
        await client.sendMessage(chatId, 'O atendimento foi finalizado. Iniciaremos um novo atendimento!');
        // Reseta o estado de conversa e pedidos
        delete conversaEstado[chatId];
        delete pedidos[chatId];
        return; // Retorna para não processar mais a mensagem
    }

    // Inicializa o estado da conversa para novos usuários
    if (!conversaEstado[chatId]) {
        conversaEstado[chatId] = {
            etapa: 'inicio',  // Começa no estado de início
            categoriaEscolhida: null,
            produtoEscolhido: null,
            quantidadeEscolhida: 0
        };
    }

    // Saudação inicial e menu de categorias
    if (conversaEstado[chatId].etapa === 'inicio' && mensagem.match(/(oi|olá|opa|bao|ola|bom dia|boa noite|)/i)) {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname;

        await client.sendMessage(chatId, `Olá, ${name.split(" ")[0]}! Sou o assistente virtual da CR Fibras. Como posso te ajudar hoje?`);
        await client.sendMessage(chatId, `Escolha uma das opções abaixo para continuar:`);
        await client.sendMessage(chatId, `B - Barcos\nP - Piscinas`);
        conversaEstado[chatId].etapa = 'escolherCategoria'; // Muda para escolher categoria
    }

    // Quando o cliente escolhe uma categoria
    if (conversaEstado[chatId].etapa === 'escolherCategoria' && categorias[mensagem.toUpperCase()]) {
        const categoriaEscolhida = mensagem.toUpperCase();
        conversaEstado[chatId].categoriaEscolhida = categoriaEscolhida;

        await client.sendMessage(chatId, `Você escolheu a categoria: ${categorias[categoriaEscolhida]}`);
        await client.sendMessage(chatId, `Aqui estão os produtos disponíveis nesta categoria:`);

        let i = 1;
        for (const produto of produtos[categoriaEscolhida]) {
            await client.sendMessage(chatId, `${i++} - ${produto.nome} ${produto.preco ? `(R$ ${produto.preco.toFixed(2)})` : ''}`);
        }

        await client.sendMessage(chatId, `Escolha o número do produto para saber mais detalhes.`);
        conversaEstado[chatId].etapa = 'escolherProduto'; // Muda para escolher produto
    }

    // Quando o cliente escolhe um produto da categoria
    if (conversaEstado[chatId].etapa === 'escolherProduto' && !isNaN(mensagem)) {
        const categoriaEscolhida = conversaEstado[chatId].categoriaEscolhida;
        const produtoEscolhido = produtos[categoriaEscolhida][parseInt(mensagem) - 1];
        conversaEstado[chatId].produtoEscolhido = produtoEscolhido;

        await client.sendMessage(chatId, `Você escolheu o produto: ${produtoEscolhido.nome}`);
        await client.sendMessage(chatId, `Aqui está a imagem do produto:`);
        await enviarImagemProduto(chatId, produtoEscolhido);

        // Se for piscina, informar que o preço será combinado
        if (!produtoEscolhido.preco) {
            await client.sendMessage(chatId, `O preço desse produto será combinado com um atendente humano. Aguarde um momento, por favor.`);
        }

        // Pergunta se deseja fazer o pedido
        await client.sendMessage(chatId, `Gostaria de fazer o pedido deste produto? Digite "Confirmar" para confirmar ou "Outro" para escolher outro produto.`);
        conversaEstado[chatId].etapa = 'confirmarPedido'; // Muda para confirmar o pedido
    }

    // Confirmar pedido
    if (conversaEstado[chatId].etapa === 'confirmarPedido') {
        if (mensagem.match(/confirmar/i)) {
            const produto = conversaEstado[chatId].produtoEscolhido;

            // Pergunta a quantidade
            await client.sendMessage(chatId, `Quantas unidades de ${produto.nome} você gostaria de pedir?`);
            conversaEstado[chatId].etapa = 'escolherQuantidade'; // Muda para escolher quantidade
        } else if (mensagem.match(/outro/i)) {
            await client.sendMessage(chatId, `Escolha uma das categorias abaixo para continuar:\nB - Barcos\nP - Piscinas`);
            conversaEstado[chatId].etapa = 'escolherCategoria';  // Volta para a escolha de categoria
        }
    }

    // Escolher a quantidade do produto
    if (conversaEstado[chatId].etapa === 'escolherQuantidade' && !isNaN(mensagem) && mensagem > 0) {
        conversaEstado[chatId].quantidadeEscolhida = parseInt(mensagem);
        const produto = conversaEstado[chatId].produtoEscolhido;
        const total = produto.preco ? produto.preco * conversaEstado[chatId].quantidadeEscolhida : 'A ser combinado';

        await client.sendMessage(chatId, `Você escolheu ${conversaEstado[chatId].quantidadeEscolhida} unidades de ${produto.nome}. O valor total será ${total}.`);
        await client.sendMessage(chatId, `Está quantidade está correta? Digite "Sim" para confirmar ou "Alterar" para mudar a quantidade.`);
        conversaEstado[chatId].etapa = 'confirmarQuantidade'; // Muda para confirmar a quantidade
    }

    // Confirmar a quantidade do pedido
    if (conversaEstado[chatId].etapa === 'confirmarQuantidade') {
        if (mensagem.match(/sim/i)) {
            const produto = conversaEstado[chatId].produtoEscolhido;
            const total = produto.preco ? produto.preco * conversaEstado[chatId].quantidadeEscolhida : 'A ser combinado';

            // Adiciona o pedido à lista de pedidos
            pedidos[chatId] = pedidos[chatId] || [];
            pedidos[chatId].push({ nome: produto.nome, quantidade: conversaEstado[chatId].quantidadeEscolhida, preco: produto.preco, total });

            await client.sendMessage(chatId, `Seu pedido foi confirmado!`);
            await client.sendMessage(chatId, `Gostaria de fazer mais algum pedido? Digite "Pedido" para adicionar mais produtos ou "Finalizar" para finalizar o pedido.`);

            conversaEstado[chatId].etapa = 'decidirAdicionarMais'; // Muda para a decisão de adicionar mais produtos
        } else if (mensagem.match(/alterar/i)) {
            await client.sendMessage(chatId, `Por favor, informe a nova quantidade.`);
            conversaEstado[chatId].etapa = 'escolherQuantidade'; // Volta para a escolha da quantidade
        }
    }

    // Decidir se vai adicionar mais produtos ou finalizar o pedido
    if (conversaEstado[chatId].etapa === 'decidirAdicionarMais') {
        if (mensagem.match(/pedido/i)) {
            await client.sendMessage(chatId, `Escolha uma das opções abaixo para continuar:\nB - Barcos\nP - Piscinas.`);
            conversaEstado[chatId].etapa = 'escolherCategoria'; // Volta para a escolha de categoria
        } else if (mensagem.match(/finalizar/i)) {
            let resumoPedido = 'Seu pedido final:\n\n';
            let totalPedido = 0;
            let temPrecoCombinado = false;

            pedidos[chatId].forEach(item => {
                resumoPedido += `${item.quantidade} x ${item.nome} - R$ ${item.preco ? item.preco.toFixed(2) : 'A ser combinado'} cada\n`;

                // Verifica se algum produto tem o preço "a ser combinado"
                if (item.total !== 'A ser combinado') {
                    totalPedido += item.total;
                } else {
                    temPrecoCombinado = true;
                }
            });

            if (!temPrecoCombinado) {
                resumoPedido += `\nTotal do pedido: R$ ${totalPedido.toFixed(2)}\n`;
            } else {
                resumoPedido += `\nO preço total será combinado com um atendente.\n`;
            }
            resumoPedido += `\nFrete a combinar!.\n\n`;

            resumoPedido += `Agradecemos pela sua preferência, volte sempre! 😊\n\n`;
            resumoPedido += `Para finalizar o seu atendimento, basta digitar "finalizado". Isso irá concluir o pedido e encerrar a conversa com o chatbot.\n\n`;
            resumoPedido += `Em breve, um atendente irá entrar em contato para combinar a entrega ou retirada do produto.`;

            await client.sendMessage(chatId, resumoPedido);
            delete pedidos[chatId];  // Limpa o pedido após a finalização
            conversaEstado[chatId].etapa = 'finalizado'; // Finaliza o processo
        } else {
            // Se o usuário não respondeu com "Pedido" ou "Finalizar", solicitar novamente
            await client.sendMessage(chatId, `Por favor, responda com "Pedido" para adicionar mais produtos ou "Finalizar" para finalizar o pedido.`);
        }
    }
});
