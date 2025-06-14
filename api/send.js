// api/send.js - VERSÃO FINAL E DEFINITIVA

import { formidable } from 'formidable';
import nodemailer from 'nodemailer';
import fs from 'fs';

// Esta configuração é crucial para o formidable funcionar na Vercel.
export const config = {
    api: {
        bodyParser: false,
    },
};

// Nova função dedicada para processar o formulário com Formidable.
// Isto garante que o stream da requisição é manuseado corretamente.
const parseForm = (req) => {
    return new Promise((resolve, reject) => {
        const form = formidable({});
        form.parse(req, (err, fields, files) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({ fields, files });
        });
    });
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Apenas o método POST é permitido' });
    }

    try {
        const { fields, files } = await parseForm(req);
        console.log("Formulário processado com sucesso pelo Formidable.");

        const attachments = [];

        // [A MUDANÇA CRUCIAL ESTÁ AQUI]
        // Processamos cada campo de ficheiro explicitamente para evitar conflitos.

        // Processa as fotos
        if (files.fotos) {
            const photos = Array.isArray(files.fotos) ? files.fotos : [files.fotos];
            for (const photo of photos) {
                if (photo && photo.originalFilename) {
                    attachments.push({
                        filename: photo.originalFilename,
                        content: fs.createReadStream(photo.filepath),
                        contentType: photo.mimetype,
                    });
                }
            }
        }
        
        // Processa o áudio gravado
        if (files.audio_gravado) {
            const audio = Array.isArray(files.audio_gravado) ? files.audio_gravado[0] : files.audio_gravado;
            if (audio && audio.originalFilename) {
                 attachments.push({
                    filename: audio.originalFilename,
                    content: fs.createReadStream(audio.filepath),
                    contentType: audio.mimetype,
                });
            }
        }
        
        // Processa o áudio enviado
        if (files.audio_enviado) {
             const audio = Array.isArray(files.audio_enviado) ? files.audio_enviado[0] : files.audio_enviado;
             if (audio && audio.originalFilename) {
                 attachments.push({
                    filename: audio.originalFilename,
                    content: fs.createReadStream(audio.filepath),
                    contentType: audio.mimetype,
                });
            }
        }

        console.log(`Total de anexos preparados: ${attachments.length}`);

        // O resto da lógica para montar e enviar o e-mail permanece a mesma.
        let emailBody = '<h1>Novo Pedido do Portal de Criação! ✨</h1>';
        for (const [key, value] of Object.entries(fields)) {
            const fieldValue = Array.isArray(value) ? value[0] : value;
            emailBody += `<p><strong>${key.replace(/_/g, ' ')}:</strong><br>${String(fieldValue).replace(/\n/g, '<br>')}</p>`;
        }
        emailBody += "<p>--<br>E-mail enviado automaticamente pelo Portal de Criação.</p>";

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        
        console.log('A enviar o e-mail...');
        
        const remetenteVerificado = process.env.EMAIL_FROM;
        const destinatario = process.env.EMAIL_TO;

        if (!destinatario || !remetenteVerificado) {
            throw new Error('As variáveis de ambiente EMAIL_FROM ou EMAIL_TO não estão configuradas corretamente na Vercel.');
        }

        await transporter.sendMail({
            from: `"Portal de Criação" <${remetenteVerificado}>`,
            to: destinatario,
            subject: `Novo Pedido de ${fields.nome_do_cliente || 'Cliente'} - Pacote ${fields.pacote_escolhido || ''}`,
            html: emailBody,
            attachments: attachments,
        });

        console.log('E-mail enviado com sucesso!');
        return res.status(200).json({ message: 'Formulário enviado com sucesso!' });

    } catch (error) {
        console.error('ERRO GERAL NO BACKEND:', error);
        // Garante que o objeto de erro é serializável
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({ message: `Ocorreu um erro no servidor: ${errorMessage}` });
    }
}