const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  family: 4, // força IPv4 — Render.com free tier não suporta IPv6 outbound
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
});

const enviarEmailRecuperacao = async (email, nome, token) => {
  const link = `${process.env.BASE_URL}/api/auth/reset-senha?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '🔑 Recuperação de senha - EducaPlay',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f5f6fa; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #3a7d44; font-size: 28px; margin: 0;">Educa<span style="color: #111827;">Play</span></h1>
          <p style="color: #6b7280; margin-top: 4px;">Organize hoje, ensine melhor amanhã.</p>
        </div>
        <div style="background: #ffffff; border-radius: 12px; padding: 28px;">
          <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Olá, ${nome}! 👋</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta no EducaPlay.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" target="_blank" style="display: inline-block; background: #3a7d44; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;">
              Redefinir minha senha
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">
            ⏱️ Este link expira em <strong>30 minutos</strong>.<br/>
            Se você não solicitou a redefinição, ignore este e-mail.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          © 2025 EducaPlay. Todos os direitos reservados.
        </p>
      </div>
    `,
  });
};

module.exports = { enviarEmailRecuperacao };
