// api/send.js - VERSÃO FINAL COM MOTOR FORMIDABLE

// Importamos a nova biblioteca 'formidable' e o 'fs' para ler ficheiros.
import { formidable } from 'formidable';
import nodemailer from 'nodemailer';
import fs from 'fs';

// Esta configuração é crucial para o formidable funcionar na Vercel.
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Apenas o método POST é permitido' });
    }

    try {
        // [A GRANDE MUDANÇA ESTÁ AQUI]
        // Usamos o 'formidable' para processar o formulário. Ele é muito mais robusto.
        const data = await new Promise((resolve, reject) => {
            const form = formidable({});
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject({ err });
                    return;
                }
                resolve({ fields, files });
            });
        });

        // O formidable organiza os ficheiros de forma diferente.
        // Vamos juntá-los todos numa única lista para anexar.
        const allFiles = [];
        for (const fileArray of Object.values(data.files)) {
             if (Array.isArray(fileArray)) {
                allFiles.push(...fileArray);
            } else {
                allFiles.push(fileArray);
            }
        }

        const attachments = allFiles.map((file) => {
            // Se o ficheiro não tiver um nome original, não o anexa.
            if (!file || !file.originalFilename) return null;
            
            return {
                filename: file.originalFilename,
                // Lemos o ficheiro a partir do caminho temporário onde o formidable o guardou.
                content: fs.createReadStream(file.filepath),
                contentType: file.mimetype,
            };
        }).filter(Boolean); // Filtra quaisquer ficheiros nulos.

        // O resto da lógica para montar e enviar o e-mail permanece a mesma.
        let emailBody = '<h1>Novo Pedido do Portal de Criação! ✨</h1>';
        for (const [key, value] of Object.entries(data.fields)) {
             if (Array.isArray(value)) {
                emailBody += `<p><strong>${key.replace(/_/g, ' ')}:</strong><br>${value.join(', ')}</p>`;
            } else {
                emailBody += `<p><strong>${key.replace(/_/g, ' ')}:</strong><br>${String(value).replace(/\n/g, '<br>')}</p>`;
            }
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
            subject: `Novo Pedido de ${data.fields.nome_do_cliente || 'Cliente'} - Pacote ${data.fields.pacote_escolhido || ''}`,
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