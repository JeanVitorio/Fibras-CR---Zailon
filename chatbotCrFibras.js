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

// Cardápio de produtos (Piscinas e Barcos)
const produtos = {
    "1": { nome: "Barco de 4.60m", preco: 3300, imagens: [
        "./Criativos/Barco_4.60/frente_direita.jpeg",
        "./Criativos/Barco_4.60/frente.jpeg",
        "./Criativos/Barco_4.60/tras_esquerda.jpeg"
    ]},
    "2": { nome: "Barco de 3m", preco: 2000, imagens: [
        "./Criativos/Barco_3m/frente_cinza.jpeg",
        "./Criativos/Barco_3m/tras_cinza.jpeg",
        "./Criativos/Barco_3m/tras_verde.jpeg"
    ]},
    "3": { nome: "Piscina 3x6x1.30", preco: 0, imagens: [
        "./Criativos/Piscina_3X6X1.30/frente.jpeg",
        "./Criativos/Piscina_3X6X1.30/frente03.jpeg",
        "./Criativos/Piscina_3X6X1.30/fretne02.jpeg"
    ]},
    "4": { nome: "Barco estilo Canoa 4m", preco: 2500, imagens: [
        "./Criativos/Barco_estilo_canoa_4m/frente.jpeg",
        "./Criativos/Barco_estilo_canoa_4m/tras.jpeg"
    ]},
    "5": { nome: "Piscina estilo retrô 2,40x4x1.30", preco: 0, imagens: [
        "./Criativos/Piscina_estilo_retro_2,40X4X1.30/lado01.jpeg",
        "./Criativos/Piscina_estilo_retro_2,40X4X1.30/lado02.jpeg",
        "./Criativos/Piscina_estilo_retro_2,40X4X1.30/lado03.jpeg"
    ]}
};

// Função que envia as imagens de um produto
async function enviarImagemProduto(chatId, produto) {
    for (let imagem of produto.imagens) {
        const media = MessageMedia.fromFilePath(imagem);
        await client.sendMessage(chatId, media, { caption: produto.nome });
    }
}

client.on('message', async msg => {
    const chatId = msg.from;
    const mensagem = msg.body.trim().toLowerCase();

    // Inicializa o estado da conversa para novos usuários
    if (!conversaEstado[chatId]) {
        conversaEstado[chatId] = {
            etapa: 'inicio',  // Começa no estado de início
            produtoEscolhido: null
        };
    }

    // Saudação inicial e menu de opções
    if (conversaEstado[chatId].etapa === 'inicio' && mensagem.match(/(oi|olá|opa|bao|ola|bom dia|boa noite|)/i)) {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname;

        await client.sendMessage(chatId, `Olá, ${name.split(" ")[0]}! Sou o assistente virtual da CR Fibras. Gostaria de saber mais sobre nossos produtos?`);
        await client.sendMessage(chatId, `Digite "Sim" para ver nossos produtos ou "Não" para falar com um atendente.`);
        conversaEstado[chatId].etapa = 'menu';  // Muda para o menu de produtos
    }

    // Quando o cliente deseja saber mais sobre os produtos
    if (conversaEstado[chatId].etapa === 'menu' && mensagem === 'sim') {
        await client.sendMessage(chatId, `Aqui estão os nossos produtos disponíveis:`);
        await client.sendMessage(chatId, `1 - Barco de 4.60m (R$ 3.300)\n2 - Barco de 3m (R$ 2.000)\n3 - Piscina 3x6x1.30 (Preço sob consulta)\n4 - Barco estilo Canoa 4m (R$ 2.500)\n5 - Piscina estilo retrô 2,40x4x1.30 (Preço sob consulta)`);
        await client.sendMessage(chatId, `Escolha o número do produto para saber mais detalhes.`);
        conversaEstado[chatId].etapa = 'escolherProduto'; // Muda para escolher produto
    }

    // Escolha de produto e mostrar detalhes
    if (conversaEstado[chatId].etapa === 'escolherProduto' && ['1', '2', '3', '4', '5'].includes(mensagem)) {
        const produtoEscolhido = mensagem;
        const produto = produtos[produtoEscolhido];
        conversaEstado[chatId].produtoEscolhido = produtoEscolhido;

        // Enviar detalhes do produto
        await client.sendMessage(chatId, `Você escolheu o produto: ${produto.nome}`);
        await client.sendMessage(chatId, `Aqui estão as imagens do produto:`);
        await enviarImagemProduto(chatId, produto);

        // Pergunta se deseja fazer o pedido
        await client.sendMessage(chatId, `Gostaria de fazer o pedido deste produto? Digite "Sim" para confirmar ou "Não" para escolher outro produto.`);
        conversaEstado[chatId].etapa = 'confirmarPedido'; // Muda para confirmar o pedido
    }

    // Confirmar pedido
    if (conversaEstado[chatId].etapa === 'confirmarPedido') {
        if (mensagem === 'sim') {
            const produto = produtos[conversaEstado[chatId].produtoEscolhido];
            pedidos[chatId] = pedidos[chatId] || [];
            pedidos[chatId].push(produto.nome);

            let total = pedidos[chatId].reduce((acc, produtoNome) => {
                const produto = Object.values(produtos).find(p => p.nome === produtoNome);
                return acc + (produto ? produto.preco : 0);
            }, 0);

            pedidos[chatId].total = total;

            // Confirmação do pedido
            await client.sendMessage(chatId, `Ficamos muito felizes com o seu interesse! 😊

Seu pedido foi confirmado com sucesso! O frete será combinado diretamente com um de nossos atendentes.

Em breve, um atendente entrará em contato para finalizar todos os detalhes e garantir que tudo corra da melhor forma possível. Se precisar de algo, estamos à disposição!

Agradecemos pela confiança na CR Fibras! 🙌`);
            delete pedidos[chatId];  // Limpa o pedido após confirmação
            conversaEstado[chatId].etapa = 'finalizado';  // Muda para finalizado
        } else if (mensagem === 'não') {
            await client.sendMessage(chatId, `Entendido! Gostaria de voltar ao menu de produtos ou preferiria falar com um atendente humano?`);
            conversaEstado[chatId].etapa = 'menu'; // Volta para o menu
        }
    }

    // Se o cliente escolhe voltar ao menu de produtos
    if (conversaEstado[chatId].etapa === 'menu' && mensagem === 'voltar') {
        await client.sendMessage(chatId, `Aqui estão as opções de produtos novamente:`);
        await client.sendMessage(chatId, `1 - Barco de 4.60m (R$ 3.300)\n2 - Barco de 3m (R$ 2.000)\n3 - Piscina 3x6x1.30 (Preço sob consulta)\n4 - Barco estilo Canoa 4m (R$ 2.500)\n5 - Piscina estilo retrô 2,40x4x1.30 (Preço sob consulta)`);
        await client.sendMessage(chatId, `Escolha o número do produto para ver mais detalhes.`);
    }

    // Se o cliente escolher falar com um atendente
    if (mensagem === 'não' || mensagem === 'nao') {
        await client.sendMessage(chatId, `Em breve, um atendente entrará em contato para ajudar!`);
        conversaEstado[chatId].etapa = 'finalizado';  // Muda para finalizado
    }
});
