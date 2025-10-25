const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Log detalhado de todas as requisições
app.use((req, res, next) => {
    console.log(' ');
    console.log('📥 NOVA REQUISIÇÃO:');
    console.log('   Método:', req.method);
    console.log('   URL:', req.url);
    console.log('   Headers:', req.headers['content-type']);
    console.log('   IP:', req.ip);
    next();
});

// Array para dados
let dadosRecebidos = [];

// Rota para API
app.post('/api/data', (req, res) => {
    console.log(' ');
    console.log('🎉🎉🎉 DADOS RECEBIDOS DO ESP32! 🎉🎉🎉');
    console.log('========================================');
    console.log('📦 DADOS COMPLETOS:', JSON.stringify(req.body, null, 2));
    console.log('========================================');
    
    // Adicionar timestamp
    const dadosComTimestamp = {
        ...req.body,
        timestamp: new Date().toLocaleString('pt-BR')
    };
    
    dadosRecebidos.unshift(dadosComTimestamp);
    if (dadosRecebidos.length > 10) {
        dadosRecebidos = dadosRecebidos.slice(0, 10);
    }
    
    res.json({ 
        status: 'success', 
        message: 'Dados recebidos com sucesso!',
        received: req.body
    });
});

// Rota para ver dados
app.get('/api/data', (req, res) => {
    res.json(dadosRecebidos);
});

// Página principal
app.get('/', (req, res) => {
    console.log('🏠 Página principal acessada');
    res.send(`
        <h1>🚀 Plataforma Multimedidor - FUNCIONANDO!</h1>
        <p>✅ API está recebendo dados</p>
        <p>📊 Dados recebidos: ${dadosRecebidos.length}</p>
        <a href="/api/data">Ver dados da API</a>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(' ');
    console.log('================================');
    console.log('🚀 SERVIDOR INICIADO COM SUCESSO!');
    console.log('📍 Local: http://localhost:' + PORT);
    console.log('🌐 Rede: http://192.168.1.183:' + PORT);
    console.log('================================');
    console.log(' ');
});