require('dotenv').config();
const Sentry = require('@sentry/node');
const express = require('express');
const cors = require('cors');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.2,
});

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check — definido ANTES das rotas para nunca passar pelo middleware de auth
app.get('/', (req, res) => res.json({ status: 'EducaPlay API rodando' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Painel de administração — acesso via navegador com senha
app.get('/admin', (req, res) => {
  const chave = req.query.key;
  if (!chave || chave !== process.env.ADMIN_SECRET_KEY) {
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>EducaPlay Admin</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f0fdf4}
    .box{background:#fff;padding:32px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1);text-align:center;max-width:340px;width:100%}
    h2{color:#3a7d44;margin-bottom:4px}p{color:#888;font-size:13px;margin-bottom:20px}
    input{width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box}
    button{margin-top:12px;width:100%;padding:12px;background:#3a7d44;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;font-weight:700}
    </style></head><body><div class="box"><h2>EducaPlay</h2><p>Painel de Administração</p>
    <form method="GET" action="/admin"><input name="key" type="password" placeholder="Chave de acesso" required/>
    <button type="submit">Entrar</button></form></div></body></html>`);
  }

  // Página principal do admin
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>EducaPlay Admin</title>
  <style>
    *{box-sizing:border-box}body{font-family:sans-serif;background:#f0fdf4;margin:0;padding:20px}
    .header{background:#3a7d44;color:#fff;padding:16px 24px;border-radius:12px;margin-bottom:24px;display:flex;align-items:center;gap:12px}
    .header h1{margin:0;font-size:20px}.header p{margin:0;font-size:12px;opacity:.75}
    .card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:20px}
    h2{font-size:16px;color:#1a1a2e;margin:0 0 16px}
    label{font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:4px}
    input{width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px}
    input:focus{outline:none;border-color:#3a7d44}
    button{padding:12px 20px;background:#3a7d44;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:700}
    button:hover{background:#2d6035}
    .msg{padding:10px 14px;border-radius:8px;font-size:13px;margin-top:10px;display:none}
    .msg.ok{background:#dcfce7;color:#166534}.msg.err{background:#fef2f2;color:#dc2626}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:8px 12px;background:#f8fafb;color:#6b7280;font-weight:600;border-bottom:1px solid #f0f0f0}
    td{padding:10px 12px;border-bottom:1px solid #f9f9f9;color:#374151}
    .badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
    .ativo{background:#dcfce7;color:#166534}.inativo{background:#fef2f2;color:#dc2626}
    .btn-sm{padding:5px 10px;font-size:12px;border-radius:6px;cursor:pointer;border:none;font-weight:600}
    .btn-toggle{background:#f1f5f9;color:#475569}
  </style></head>
  <body>
  <div class="header">
    <div><h1>EducaPlay — Painel Admin</h1><p>Gerenciamento de escolas</p></div>
  </div>

  <div class="card">
    <h2>Criar Nova Escola</h2>
    <label>Nome da escola</label>
    <input id="nome" placeholder="Ex: Colégio Foch" />
    <label>Código de acesso (supervisão usa este código para se cadastrar)</label>
    <input id="codigo" placeholder="Ex: Foch_2026" />
    <button onclick="criarEscola()">Criar Escola</button>
    <div id="msg" class="msg"></div>
  </div>

  <div class="card">
    <h2>Escolas Cadastradas</h2>
    <table id="tabela">
      <thead><tr><th>Nome</th><th>Código</th><th>Usuários</th><th>Status</th><th>Ação</th></tr></thead>
      <tbody id="tbody"><tr><td colspan="5" style="text-align:center;color:#aaa">Carregando...</td></tr></tbody>
    </table>
  </div>

  <script>
    const KEY = '${chave}';
    const API = '/api/admin/escolas';
    const H = {'Content-Type':'application/json','x-admin-key':KEY};

    async function carregar(){
      const r = await fetch(API,{headers:H});
      const d = await r.json();
      const tb = document.getElementById('tbody');
      if(!d.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:#aaa">Nenhuma escola cadastrada</td></tr>';return;}
      tb.innerHTML = d.map(e=>\`<tr>
        <td><b>\${e.nome}</b></td>
        <td><code>\${e.codigo}</code></td>
        <td>\${e._count?.usuarios??0}</td>
        <td><span class="badge \${e.ativo?'ativo':'inativo'}">\${e.ativo?'Ativa':'Inativa'}</span></td>
        <td><button class="btn-sm btn-toggle" onclick="toggle('\${e.id}')">\${e.ativo?'Desativar':'Ativar'}</button></td>
      </tr>\`).join('');
    }

    async function criarEscola(){
      const nome=document.getElementById('nome').value.trim();
      const codigo=document.getElementById('codigo').value.trim();
      const msg=document.getElementById('msg');
      if(!nome||!codigo){showMsg('Preencha o nome e o código.','err');return;}
      const r=await fetch(API,{method:'POST',headers:H,body:JSON.stringify({nome,codigo})});
      const d=await r.json();
      if(r.ok){showMsg('Escola criada com sucesso!','ok');document.getElementById('nome').value='';document.getElementById('codigo').value='';carregar();}
      else showMsg(d.error||'Erro ao criar escola.','err');
    }

    async function toggle(id){
      await fetch(API+'/'+id+'/toggle',{method:'PUT',headers:H});
      carregar();
    }

    function showMsg(t,tipo){const m=document.getElementById('msg');m.textContent=t;m.className='msg '+tipo;m.style.display='block';setTimeout(()=>m.style.display='none',4000);}
    carregar();
  </script>
  </body></html>`);
});

// Rotas autenticadas
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api', require('./src/routes/api'));

// Sentry captura erros antes do handler genérico
Sentry.setupExpressErrorHandler(app);

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
