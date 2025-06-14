// api/send.js - VERSÃO CORRIGIDA

import Busboy from 'busboy';
import nodemailer from 'nodemailer';

const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Apenas o método POST é permitido' });
    }

    try {
        const busboy = Busboy({ headers: req.headers });

        const fields = {};
        const fileUploads = [];

        busboy.on('field', (fieldname, val) => {
            console.log(`Campo de texto recebido: ${fieldname}`);
            fields[fieldname] = val;
        });

        busboy.on('file', (fieldname, file, filename) => {
            console.log(`Recebendo arquivo: ${filename.filename}`);
            fileUploads.push(
                streamToBuffer(file).then(buffer => ({
                    fieldname,
                    buffer,
                    filename: filename.filename,
                    contentType: filename.mimeType,
                }))
            );
        });

        await new Promise((resolve, reject) => {
            busboy.on('finish', resolve);
            busboy.on('error', reject);
            req.pipe(busboy);
        });
        
        const files = await Promise.all(fileUploads);
        console.log('Todos os arquivos foram processados.');

        const attachments = files.map(file => ({
            filename: file.filename,
            content: file.buffer,
            contentType: file.contentType,
        }));
        
        let emailBody = '<h1>Novo Pedido do Portal de Criação! ✨</h1>';
        for (const [key, value] of Object.entries(fields)) {
            emailBody += `<p><strong>${key.replace(/_/g, ' ')}:</strong><br>${value.replace(/\n/g, '<br>')}</p>`;
        }
        emailBody += "<p>--<br>E-mail enviado automaticamente pelo Portal de Criação.</p>"

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER, // <- Este é o LOGIN
                pass: process.env.EMAIL_PASS,
            },
        });
        
        console.log('Enviando o e-mail com as novas configurações...');
        await transporter.sendMail({
            // [A GRANDE CORREÇÃO ESTÁ AQUI!]
            // Agora usamos a variável EMAIL_FROM, que é um remetente verificado,
            // em vez de usar o e-mail de login.
            from: `"Portal de Criação" <${process.env.EMAIL_FROM}>`, // <- Este é o REMETENTE
            to: process.env.EMAIL_TO,
            subject: `Novo Pedido de ${fields.nome_do_cliente || 'Cliente'} - Pacote ${fields.pacote_escolhido || ''}`,
            html: emailBody,
            attachments: attachments,
        });

        console.log('E-mail enviado com sucesso!');
        return res.status(200).json({ message: 'Formulário enviado com sucesso!' });

    } catch (error) {
        console.error('ERRO GERAL NO BACKEND:', error);
        return res.status(500).json({ message: `Ocorreu um erro no servidor: ${error.message}` });
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};