// api/send.js - VERSÃO FINAL COM LEITURA DE BUFFER EM MEMÓRIA

import { formidable } from 'formidable';
import nodemailer from 'nodemailer';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

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

        if (files.anexos) {
            const fileArray = Array.isArray(files.anexos) ? files.anexos : [files.anexos];
            
            for (const file of fileArray) {
                if (file && file.originalFilename) {
                    // [A MUDANÇA MAIS IMPORTANTE]
                    // Em vez de criar um stream a partir do disco, lemos o ficheiro diretamente para um buffer em memória.
                    // Isto é muito mais rápido e evita o estouro de tempo em ambientes serverless.
                    const fileBuffer = fs.readFileSync(file.filepath);
                    
                    attachments.push({
                        filename: file.originalFilename,
                        content: fileBuffer, // Anexamos o buffer diretamente.
                        contentType: file.mimetype,
                    });

                    // Removemos o ficheiro temporário imediatamente para limpar o espaço.
                    fs.unlinkSync(file.filepath);
                }
            }
        }

        console.log(`Total de anexos preparados: ${attachments.length}`);
        
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({ message: `Ocorreu um erro no servidor: ${errorMessage}` });
    }
}