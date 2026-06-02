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

  // Página principal do admin — responsiva para mobile
  res.send(`<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>EducaPlay Admin</title>
  <style>
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0fdf4;margin:0;padding:16px;min-height:100vh}
    .header{background:#3a7d44;color:#fff;padding:16px 20px;border-radius:16px;margin-bottom:20px}
    .header h1{margin:0;font-size:18px;font-weight:800}
    .header p{margin:4px 0 0;font-size:12px;opacity:.75}
    .card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:16px}
    h2{font-size:15px;font-weight:700;color:#1a1a2e;margin:0 0 16px}
    label{font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px}
    input{width:100%;padding:13px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;margin-bottom:12px;background:#fafafa;-webkit-appearance:none}
    input:focus{outline:none;border-color:#3a7d44;background:#fff}
    .btn-criar{width:100%;padding:14px;background:#3a7d44;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px}
    .btn-criar:active{background:#2d6035}
    .msg{padding:12px 14px;border-radius:10px;font-size:13px;margin-top:12px;display:none;font-weight:600}
    .msg.ok{background:#dcfce7;color:#166534}.msg.err{background:#fef2f2;color:#dc2626}

    /* Cards de escola — mobile-first, sem tabela */
    .escola-card{border:1.5px solid #f0f0f0;border-radius:12px;padding:14px 16px;margin-bottom:10px}
    .escola-nome{font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:4px}
    .escola-codigo{font-size:12px;color:#6b7280;font-family:monospace;margin-bottom:8px}
    .escola-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .escola-info{display:flex;align-items:center;gap:8px}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
    .ativo{background:#dcfce7;color:#166534}.inativo{background:#fef2f2;color:#dc2626}
    .usuarios{font-size:12px;color:#9ca3af}
    .btn-toggle{padding:8px 14px;font-size:12px;font-weight:700;border-radius:8px;cursor:pointer;border:none;min-height:36px}
    .btn-desativar{background:#fef2f2;color:#dc2626}
    .btn-ativar{background:#dcfce7;color:#166534}
    .lista-vazia{text-align:center;color:#aaa;padding:24px 0;font-size:14px}

    /* Tabela só em telas maiores */
    .tabela-wrap{display:none}
    @media(min-width:600px){
      body{padding:24px;max-width:700px;margin:0 auto}
      .escola-lista{display:none}
      .tabela-wrap{display:block;overflow-x:auto}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;padding:10px 14px;background:#f8fafb;color:#6b7280;font-weight:600;border-bottom:2px solid #f0f0f0}
      td{padding:12px 14px;border-bottom:1px solid #f9f9f9;color:#374151;vertical-align:middle}
      .btn-sm{padding:7px 14px;font-size:12px;border-radius:8px;cursor:pointer;border:none;font-weight:700;min-height:34px}
      .btn-toggle-tbl-d{background:#fef2f2;color:#dc2626}
      .btn-toggle-tbl-a{background:#dcfce7;color:#166534}
    }

    /* Modal de confirmação */
    .overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.55);display:none;align-items:flex-end;justify-content:center;z-index:999;padding:0}
    .overlay.show{display:flex}
    @media(min-width:600px){.overlay{align-items:center;padding:16px}}
    .dialog{background:#fff;border-radius:24px 24px 0 0;padding:28px 24px 36px;width:100%;box-shadow:0 -4px 40px rgba(0,0,0,.18);max-height:90vh;overflow-y:auto}
    @media(min-width:600px){.dialog{border-radius:20px;max-width:440px;width:90%;padding:32px}}
    .dialog-handle{width:40px;height:4px;background:#e0e0e0;border-radius:2px;margin:0 auto 20px}
    @media(min-width:600px){.dialog-handle{display:none}}
    .dialog h3{margin:0 0 8px;font-size:18px;font-weight:800;color:#1a1a2e}
    .dialog p{font-size:13px;color:#555;margin:0 0 4px;line-height:1.6}
    .dialog code{display:block;background:#fef2f2;color:#dc2626;padding:10px 12px;border-radius:8px;font-size:13px;margin:10px 0;word-break:break-all;line-height:1.5}
    .dialog input{width:100%;padding:13px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;margin-top:8px;background:#fafafa}
    .dialog input:focus{outline:none;border-color:#dc2626;background:#fff}
    .dialog-btns{display:flex;gap:10px;margin-top:20px}
    .btn-cancel{flex:1;padding:14px;background:#f1f5f9;color:#475569;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px}
    .btn-confirm{flex:1;padding:14px;background:#dc2626;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px;opacity:.35;pointer-events:none}
    .btn-confirm.ok{opacity:1;pointer-events:auto}
  </style></head>
  <body>
  <div class="overlay" id="overlay">
    <div class="dialog">
      <div class="dialog-handle"></div>
      <h3>⚠️ Desativar escola</h3>
      <p>Para confirmar, copie e cole exatamente:</p>
      <code id="textoConfirm"></code>
      <input id="inputConfirm" placeholder="Cole o texto acima aqui..." oninput="checarConfirm()" autocomplete="off"/>
      <div class="dialog-btns">
        <button class="btn-cancel" onclick="fecharDialog()">Cancelar</button>
        <button class="btn-confirm" id="btnConfirm" onclick="executarToggle()">Desativar</button>
      </div>
    </div>
  </div>

  <div class="header">
    <h1>EducaPlay — Admin</h1>
    <p>Gerenciamento de escolas</p>
  </div>

  <div class="card">
    <h2>➕ Nova Escola</h2>
    <label>Nome da escola</label>
    <input id="nome" placeholder="Ex: Colégio Foch" autocomplete="off"/>
    <label>Código de acesso</label>
    <input id="codigo" placeholder="Ex: Foch_2026" autocomplete="off"/>
    <button class="btn-criar" onclick="criarEscola()">Criar Escola</button>
    <div id="msg" class="msg"></div>
  </div>

  <div class="card">
    <h2>🏫 Escolas Cadastradas</h2>

    <!-- Mobile: lista de cards -->
    <div class="escola-lista" id="lista-mobile">
      <p class="lista-vazia">Carregando...</p>
    </div>

    <!-- Desktop: tabela -->
    <div class="tabela-wrap">
      <table>
        <thead><tr><th>Nome</th><th>Código</th><th>Usuários</th><th>Status</th><th>Ação</th></tr></thead>
        <tbody id="tbody"><tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">Carregando...</td></tr></tbody>
      </table>
    </div>
  </div>

  <script>
    const KEY = '${chave}';
    const API = '/api/admin/escolas';
    const H = {'Content-Type':'application/json','x-admin-key':KEY};

    async function carregar(){
      const r = await fetch(API,{headers:H});
      const d = await r.json();

      // Mobile cards
      const lista = document.getElementById('lista-mobile');
      if(!d.length){
        lista.innerHTML='<p class="lista-vazia">Nenhuma escola cadastrada</p>';
      } else {
        lista.innerHTML = d.map(e=>\`
          <div class="escola-card">
            <div class="escola-nome">\${e.nome}</div>
            <div class="escola-codigo">\${e.codigo}</div>
            <div class="escola-row">
              <div class="escola-info">
                <span class="badge \${e.ativo?'ativo':'inativo'}">\${e.ativo?'Ativa':'Inativa'}</span>
                <span class="usuarios">👥 \${e._count?.usuarios??0} usuário\${(e._count?.usuarios??0)!==1?'s':''}</span>
              </div>
              <button class="btn-toggle \${e.ativo?'btn-desativar':'btn-ativar'}"
                onclick="\${e.ativo?\`abrirDialog('\${e.id}','\${e.nome}')\`:\`toggle('\${e.id}')\`}">
                \${e.ativo?'Desativar':'Ativar'}
              </button>
            </div>
          </div>\`).join('');
      }

      // Desktop tabela
      const tb = document.getElementById('tbody');
      if(!d.length){
        tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">Nenhuma escola cadastrada</td></tr>';
      } else {
        tb.innerHTML = d.map(e=>\`<tr>
          <td><b>\${e.nome}</b></td>
          <td><code style="background:#f8fafb;padding:3px 8px;border-radius:6px;font-size:12px">\${e.codigo}</code></td>
          <td>\${e._count?.usuarios??0}</td>
          <td><span class="badge \${e.ativo?'ativo':'inativo'}">\${e.ativo?'Ativa':'Inativa'}</span></td>
          <td><button class="btn-sm \${e.ativo?'btn-toggle-tbl-d':'btn-toggle-tbl-a'}"
            onclick="\${e.ativo?\`abrirDialog('\${e.id}','\${e.nome}')\`:\`toggle('\${e.id}')\`}">
            \${e.ativo?'Desativar':'Ativar'}</button></td>
        </tr>\`).join('');
      }
    }

    async function criarEscola(){
      const nome=document.getElementById('nome').value.trim();
      const codigo=document.getElementById('codigo').value.trim();
      if(!nome||!codigo){showMsg('Preencha o nome e o código.','err');return;}
      const r=await fetch(API,{method:'POST',headers:H,body:JSON.stringify({nome,codigo})});
      const d=await r.json();
      if(r.ok){
        showMsg('✅ Escola criada com sucesso!','ok');
        document.getElementById('nome').value='';
        document.getElementById('codigo').value='';
        carregar();
      } else showMsg(d.error||'Erro ao criar escola.','err');
    }

    let _toggleId=null, _textoEsperado='';

    function abrirDialog(id,nome){
      _toggleId=id;
      _textoEsperado=\`Eu quero desativar a instituição \${nome}\`;
      document.getElementById('textoConfirm').textContent=_textoEsperado;
      document.getElementById('inputConfirm').value='';
      document.getElementById('btnConfirm').classList.remove('ok');
      document.getElementById('overlay').classList.add('show');
      setTimeout(()=>document.getElementById('inputConfirm').focus(),300);
    }

    function fecharDialog(){
      document.getElementById('overlay').classList.remove('show');
      _toggleId=null;
    }

    function checarConfirm(){
      const val=document.getElementById('inputConfirm').value;
      document.getElementById('btnConfirm').classList.toggle('ok',val===_textoEsperado);
    }

    async function executarToggle(){
      if(!_toggleId)return;
      await fetch(API+'/'+_toggleId+'/toggle',{method:'PUT',headers:H});
      fecharDialog();
      carregar();
    }

    async function toggle(id){
      await fetch(API+'/'+id+'/toggle',{method:'PUT',headers:H});
      carregar();
    }

    function showMsg(t,tipo){
      const m=document.getElementById('msg');
      m.textContent=t;m.className='msg '+tipo;m.style.display='block';
      setTimeout(()=>m.style.display='none',4000);
    }

    // Fechar overlay ao clicar fora
    document.getElementById('overlay').addEventListener('click',function(e){
      if(e.target===this)fecharDialog();
    });

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
