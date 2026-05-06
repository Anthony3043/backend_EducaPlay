const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

module.exports = async (req, res) => {
  const { token, ok } = req.query;

  if (ok === '1') {
    return res.send(renderPage({ sucesso: true }));
  }

  if (!token) {
    return res.send(renderPage({ invalido: true }));
  }

  const usuario = await prisma.usuario.findFirst({
    where: { resetToken: token, resetTokenExp: { gt: new Date() } },
  });

  if (!usuario) {
    return res.send(renderPage({ invalido: true }));
  }

  return res.send(renderPage({ token }));
};

function renderPage({ token = '', erro = '', sucesso = false, invalido = false }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Redefinir senha — EducaPlay</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f5f6fa; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #fff; border-radius: 20px; padding: 36px 32px; max-width: 420px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.10); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo h1 { font-size: 26px; color: #3a7d44; }
    .logo h1 span { color: #111827; }
    .logo p { color: #6b7280; font-size: 13px; margin-top: 4px; }
    .icon { text-align: center; font-size: 52px; margin-bottom: 16px; }
    h2 { text-align: center; font-size: 20px; color: #1a1d3b; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #7a7f9a; font-size: 14px; margin-bottom: 24px; line-height: 1.6; }
    label { display: block; font-size: 13px; font-weight: 600; color: #1a1d3b; margin-bottom: 6px; }
    .input-wrap { position: relative; margin-bottom: 16px; }
    input { width: 100%; padding: 13px 44px 13px 14px; border: 1.5px solid #e8eaf0; border-radius: 12px; font-size: 15px; color: #1a1d3b; background: #f5f6fa; outline: none; transition: border-color .2s; }
    input:focus { border-color: #3a7d44; background: #fff; }
    .toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 18px; user-select: none; }
    .btn { width: 100%; padding: 15px; background: #3a7d44; color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; transition: background .2s; display: block; text-align: center; text-decoration: none; }
    .btn:hover { background: #2e6436; }
    .btn:disabled { background: #a8d5b0; cursor: not-allowed; }
    .erro { background: #fff0f2; border: 1px solid #f0556b; color: #c0293e; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
    .forca { display: flex; gap: 6px; margin-bottom: 6px; }
    .barra { flex: 1; height: 4px; border-radius: 2px; background: #e8eaf0; transition: background .3s; }
    .forca-label { font-size: 12px; font-weight: 700; margin-bottom: 14px; min-height: 18px; }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">
    <h1>Educa<span>Play</span></h1>
    <p>Organize hoje, ensine melhor amanhã.</p>
  </div>

  ${invalido ? `
    <div class="icon">⚠️</div>
    <h2>Link inválido ou expirado</h2>
    <p class="subtitle">Este link de recuperação não é mais válido.<br/>Solicite um novo pelo aplicativo.</p>
  ` : sucesso ? `
    <div class="icon">🎉</div>
    <h2>Senha redefinida!</h2>
    <p class="subtitle">Sua senha foi atualizada com sucesso.<br/>Você já pode fazer login no aplicativo.</p>
    <a href="educaplayfrontend:///Login" class="btn" style="margin-top:16px;">Abrir o aplicativo</a>
  ` : `
    <div class="icon">🔐</div>
    <h2>Nova senha</h2>
    <p class="subtitle">Crie uma senha segura para proteger sua conta.</p>

    ${erro ? `<div class="erro">⚠️ ${erro}</div>` : ''}

    <label>Nova senha</label>
    <div class="input-wrap">
      <input type="password" id="novaSenha" placeholder="Mínimo 8 caracteres" oninput="avaliar()"/>
      <span class="toggle" onclick="toggle('novaSenha',this)">👁️</span>
    </div>
    <div class="forca">
      <div class="barra" id="b1"></div>
      <div class="barra" id="b2"></div>
      <div class="barra" id="b3"></div>
      <div class="barra" id="b4"></div>
    </div>
    <div class="forca-label" id="forcaLabel"></div>

    <label>Confirmar senha</label>
    <div class="input-wrap">
      <input type="password" id="confirmar" placeholder="Repita a nova senha" oninput="avaliar()"/>
      <span class="toggle" onclick="toggle('confirmar',this)">👁️</span>
    </div>

    <button class="btn" id="btn" onclick="enviar()" disabled>Redefinir senha →</button>

    <script>
      function toggle(id, el) {
        const inp = document.getElementById(id);
        inp.type = inp.type === 'password' ? 'text' : 'password';
        el.textContent = inp.type === 'password' ? '👁️' : '🙈';
      }
      function avaliar() {
        const s = document.getElementById('novaSenha').value;
        const c = document.getElementById('confirmar').value;
        let score = 0;
        if (s.length >= 8) score++;
        if (/[A-Z]/.test(s)) score++;
        if (/[0-9]/.test(s)) score++;
        if (/[^A-Za-z0-9]/.test(s)) score++;
        const cores = ['#e8eaf0','#f0556b','#f59e0b','#3b82f6','#4cd97b'];
        const labels = ['','Fraca','Razoável','Boa','Forte'];
        for (let i = 1; i <= 4; i++) {
          document.getElementById('b'+i).style.background = i <= score ? cores[score] : '#e8eaf0';
        }
        const lbl = document.getElementById('forcaLabel');
        lbl.textContent = labels[score] || '';
        lbl.style.color = cores[score];
        document.getElementById('btn').disabled = !(s.length >= 8 && s === c && score >= 2);
      }
      async function enviar() {
        const btn = document.getElementById('btn');
        const novaSenha = document.getElementById('novaSenha').value;
        btn.disabled = true;
        btn.textContent = 'Salvando...';
        try {
          const res = await fetch('/api/auth/reset-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: '${token}', novaSenha })
          });
          if (res.ok) {
            window.location.href = '/api/auth/reset-senha?ok=1';
          } else {
            const data = await res.json();
            btn.disabled = false;
            btn.textContent = 'Redefinir senha →';
            alert(data.error || 'Erro ao redefinir senha.');
          }
        } catch(e) {
          btn.disabled = false;
          btn.textContent = 'Redefinir senha →';
          alert('Erro de conexão. Tente novamente.');
        }
      }
    </script>
  `}
</div>
</body>
</html>`;
}
