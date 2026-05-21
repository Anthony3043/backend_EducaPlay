require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rotas
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api', require('./src/routes/api'));

// Health check
app.get('/', (req, res) => res.json({ status: 'EducaPlay API rodando ✅' }));

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
