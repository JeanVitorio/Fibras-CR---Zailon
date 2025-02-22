const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const client = new Client();
const path = require('path');

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Chatbot da Fibras CR Soluções em Fibras conectado!');
});

client.initialize();

let pedidos = {};
let enderecos = {};

const produtos = {
    "1A": { 
        nome: "Barco Fibra 6m", 
        preco: 25000 
    },
    "1B": { 
        nome: "Barco Fibra 8m", 
        preco: 35000 
    },
    "1C": { 
        nome: "Barco Fibra 10m", 
        preco: 45000 
    },
    "2A": { 
        nome: "Piscina Fibra 4x2m", 
        preco: 10000 
    },
    "2B": { 
        nome: "Piscina Fibra 6x3m", 
        preco: 15000 
    },
    "2C": { 
        nome: "Piscina Fibra 8x4m", 
        preco: 20000 
    },
    "3A": { 
        nome: "Barco Fibra 4.60m", 
        preco: 22000,
        descricao: "Barco de 4.60m comprimento, 45cm de altura da borda alta, 1.25m de largura no meio e 1.10m na traseira, reforçado para motor de 6HP, com 6 porta molinete, 1 banco porta objetos, 1 banco viveiro e 1 banco caixa de ar. Capacidade para até 5 pessoas e suporta até 75kg por pessoa.",
        imagens: [
            path.join(__dirname, 'Criativos', 'Barco_4.60', 'frente_direita.jpeg'),
            path.join(__dirname, 'Criativos', 'Barco_4.60', 'frente.jpeg'),
            path.join(__dirname, 'Criativos', 'Barco_4.60', 'tras_esquerda.jpeg')
        ],
        video: path.join(__dirname, 'Criativos', 'Barco_4.60', 'video_demonstrativo.mp4')
    }
};

const adicionais = {
    "capa": { nome: "Capa para Barco", preco: 1500 },
    "escada": { nome: "Escada para Piscina", preco: 800 },
    "bomba": { nome: "Bomba para Piscina", preco: 2000 }
};

client.on('message', async msg => {
    const chatId = msg.from;

    if (msg.body.match(/(menu|produtos|oi|olá|opa)/i) && chatId.endsWith('@c.us')) {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname;
        pedidos[chatId] = [];

        await client.sendMessage(chatId, `Olá, ${name.split(" ")[0]}! Como podemos te ajudar?

1 - Ver os produtos 🌊
2 - Fazer um pedido 📦
3 - Consultar prazo de entrega 🚀
4 - Falar com um atendente 👨‍💼`);
    }

    if (msg.body === '1' && chatId.endsWith('@c.us')) {
        await client.sendMessage(chatId, `Aqui estão nossos produtos:

**Barcos de Fibra:**
1 - Barco Fibra 6m - R$ 25.000,00
2 - Barco Fibra 8m - R$ 35.000,00
3 - Barco Fibra 10m - R$ 45.000,00

**Piscinas de Fibra:**
4 - Piscina Fibra 4x2m - R$ 10.000,00
5 - Piscina Fibra 6x3m - R$ 15.000,00
6 - Piscina Fibra 8x4m - R$ 20.000,00

**Barco Fibra 4.60m - R$ 22.000,00**
- Para mais detalhes, digite "Barco 4.60m".`);
    }

    if (msg.body.match(/barco 4.60m/i) && chatId.endsWith('@c.us')) {
        const produto = produtos["3A"];
        
        await client.sendMessage(chatId, `Aqui estão os detalhes do nosso Barco Fibra 4.60m:
        
**Descrição:**
${produto.descricao}

**Imagens:**
- (Imagem 1: Frente direita)`);
        
        await client.sendMessage(chatId, { 
            caption: 'Frente Direita do Barco', 
            file: produto.imagens[0], 
            mediaType: 'image/jpeg'
        });
        
        await client.sendMessage(chatId, { 
            caption: 'Frente do Barco', 
            file: produto.imagens[1], 
            mediaType: 'image/jpeg'
        });
        
        await client.sendMessage(chatId, { 
            caption: 'Traseira esquerda do Barco', 
            file: produto.imagens[2], 
            mediaType: 'image/jpeg'
        });

        await client.sendMessage(chatId, `Assista ao vídeo demonstrativo do barco:`);
        await client.sendMessage(chatId, { 
            caption: 'Vídeo demonstrativo', 
            file: produto.video, 
            mediaType: 'video/mp4'
        });
    }

    if (msg.body.match(/^([1-2][A-C],?\s?)+$/i) && chatId.endsWith('@c.us')) {
        const pedidosCliente = msg.body.toUpperCase().split(/,\s?/);
        let total = 0;
        pedidos[chatId] = pedidosCliente.map(pedido => {
            if (produtos[pedido]) {
                total += produtos[pedido].preco;
                return produtos[pedido].nome;
            }
        }).filter(Boolean);

        await client.sendMessage(chatId, `Você deseja adicionar algum adicional? Temos:
- Capa para Barco (R$ 1.500,00)
- Escada para Piscina (R$ 800,00)
- Bomba para Piscina (R$ 2.000,00)

Digite o nome do adicional ou "Não" para finalizar.`);
        
        pedidos[chatId].total = total; // Armazena o total até o momento
    }

    const adicionalPedido = msg.body.toLowerCase();
    
    if (adicionalPedido in adicionais && chatId.endsWith('@c.us')) {
        const adicional = adicionais[adicionalPedido];
        await client.sendMessage(chatId, `Você escolheu ${adicional.nome}. Deseja adicionar mais algum produto ou adicional? (Sim/Não)`);
        
        pedidos[chatId].adicional = adicional; // Armazena o adicional escolhido
    }

    const respostaSimNao = msg.body.toLowerCase();

    if ((respostaSimNao === 'não' || respostaSimNao === 'nao') && chatId.endsWith('@c.us')) {
        const pedidoConfirmado = pedidos[chatId].join(', ');
        const total = pedidos[chatId].total; // Obtem o total final
        await client.sendMessage(chatId, `Confirmando seu pedido!
Você pediu: ${pedidoConfirmado}
Valor total: R$ ${total},00
**Frete a combinar.**
Por favor, digite "Entrega" ou "Retirada".`);
    }

    if ((respostaSimNao === 'sim') && chatId.endsWith('@c.us')) {
        await client.sendMessage(chatId, `Ótimo! O que mais você gostaria de adicionar ao seu pedido?`);
    }

    if (respostaSimNao === 'retirada' && chatId.endsWith('@c.us')) {
        await client.sendMessage(chatId, 'Seu pedido estará pronto para retirada em aproximadamente 40 minutos. Obrigado pela preferência! 🌊😊');
        delete pedidos[chatId];
    }

    if (respostaSimNao === 'entrega' && chatId.endsWith('@c.us')) {
        await client.sendMessage(chatId, 'Por favor, informe seu endereço com Rua, Bairro e Número.');
    }

    if (msg.body.match(/(rua|bairro|número|numero)/i) && chatId.endsWith('@c.us')) {
        enderecos[chatId] = msg.body;
        const pedidoConfirmado = pedidos[chatId].join(', ');
        const total = pedidos[chatId].total; // Obtem o total final
        
        await client.sendMessage(chatId, `Obrigado! Seu pedido: ${pedidoConfirmado} será entregue em aproximadamente 1 hora no endereço:
${enderecos[chatId]}
Valor total: R$ ${total},00

**Frete a combinar.**

Agradecemos a preferência! 🌊😊`);
        delete pedidos[chatId];
        delete enderecos[chatId];
    }
});
