// Este é o nosso "robô", a função serverless que vai morar na Vercel.
// Importamos as ferramentas que instalamos: Busboy para desempacotar os dados
// e Nodemailer para enviar o e-mail.
import Busboy from 'busboy';
import nodemailer from 'nodemailer';

// Esta função auxiliar transforma um fluxo de dados (como um arquivo sendo upado)
// em um "buffer", que é a representação completa do arquivo na memória.
// Pense nela como "esperar o download do arquivo terminar" no lado do servidor.
const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
};

// Esta é a função principal que a Vercel vai executar.
// 'req' (request) contém todos os dados que o formulário enviou.
// 'res' (response) é o que usamos para enviar uma resposta de volta (sucesso ou erro).
export default async function handler(req, res) {
    // Verificamos se o formulário foi enviado usando o método POST.
    // Se não for, é um acesso inválido.
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Apenas o método POST é permitido' });
    }

    try {
        // Inicializamos o Busboy para ele começar a "ouvir" os dados que estão chegando.
        const busboy = Busboy({ headers: req.headers });

        const fields = {}; // Um objeto para guardar todos os campos de texto (nome, história, etc.).
        const fileUploads = []; // Uma lista para guardar os arquivos que estão sendo processados.

        // O Busboy emite eventos. Este é para quando ele encontra um campo de texto.
        busboy.on('field', (fieldname, val) => {
            console.log(`Campo de texto recebido: ${fieldname}`);
            fields[fieldname] = val;
        });

        // Este evento é para quando o Busboy encontra um arquivo.
        busboy.on('file', (fieldname, file, filename) => {
            console.log(`Recebendo arquivo: ${filename.filename}`);
            // Nós não esperamos o arquivo terminar aqui. Em vez disso, adicionamos a "promessa"
            // de que ele será processado à nossa lista 'fileUploads'.
            fileUploads.push(
                streamToBuffer(file).then(buffer => ({
                    fieldname,
                    buffer,
                    filename: filename.filename,
                    contentType: filename.mimeType,
                }))
            );
        });

        // Criamos uma promessa que só será resolvida quando o Busboy terminar de processar
        // toda a requisição que veio do formulário.
        await new Promise((resolve, reject) => {
            busboy.on('finish', resolve);
            busboy.on('error', reject);
            req.pipe(busboy); // Conectamos a requisição de entrada ao Busboy.
        });
        
        // Agora que o Busboy terminou, esperamos que todas as promessas de upload de
        // arquivo na nossa lista sejam resolvidas.
        const files = await Promise.all(fileUploads);
        console.log('Todos os arquivos foram processados e estão na memória.');

        // Formatamos os arquivos para o formato que o Nodemailer entende como anexo.
        const attachments = files.map(file => ({
            filename: file.filename,
            content: file.buffer,
            contentType: file.contentType,
        }));
        
        // Montamos o corpo do e-mail em HTML, listando todos os campos de texto recebidos.
        let emailBody = '<h1>Novo Pedido do Portal de Criação! ✨</h1>';
        for (const [key, value] of Object.entries(fields)) {
            // Substituímos '_' por espaço para deixar os títulos mais bonitos.
            // Substituímos quebras de linha '\n' por '<br>' para formatar no HTML.
            emailBody += `<p><strong>${key.replace(/_/g, ' ')}:</strong><br>${value.replace(/\n/g, '<br>')}</p>`;
        }
        emailBody += "<p>--<br>E-mail enviado automaticamente pelo Portal de Criação.</p>"

        // Configuração do "Carteiro" (Nodemailer).
        // As credenciais secretas (host, usuário, senha) são lidas das "Environment Variables"
        // que vamos configurar no painel da Vercel. Isso mantém suas senhas seguras.
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false, // para a porta 587
            auth: {
                user: process.env.EMAIL_USER, // seu login da Brevo
                pass: process.env.EMAIL_PASS, // sua senha SMTP da Brevo
            },
        });
        
        console.log('Enviando o e-mail...');
        // O comando final para enviar o e-mail com tudo junto.
        await transporter.sendMail({
            from: `"Portal de Criação" <${process.env.EMAIL_USER}>`, // Remetente
            to: process.env.EMAIL_TO, // Destinatário (você)
            subject: `Novo Pedido de ${fields.nome_do_cliente || 'Cliente'} - Pacote ${fields.pacote_escolhido || ''}`,
            html: emailBody,
            attachments: attachments, // Nossos arquivos vão aqui!
        });

        console.log('E-mail enviado com sucesso!');
        // Se tudo deu certo, enviamos uma resposta de sucesso para o formulário.
        return res.status(200).json({ message: 'Formulário enviado com sucesso!' });

    } catch (error) {
        console.error('ERRO GERAL NO BACKEND:', error);
        // Se algo deu errado, enviamos uma resposta de erro detalhada para o formulário.
        return res.status(500).json({ message: `Ocorreu um erro no servidor: ${error.message}` });
    }
}

// Configuração extra e MUITO IMPORTANTE para a Vercel.
// Ela desativa o "parser" de corpo padrão da Vercel, permitindo que o nosso
// Busboy possa ler os dados brutos da requisição. Sem isso, não funciona.
export const config = {
    api: {
        bodyParser: false,
    },
};
