console.log("🎯 TESTE INICIADO!");
console.log("✅ Node.js está funcionando!");
console.log("🚀 Servidor de teste...");

const http = require('http');

const server = http.createServer((req, res) => {
    console.log('📥 Requisição recebida:', req.url);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h1>✅ Teste Funcionando!</h1>');
});

server.listen(3000, () => {
    console.log('📍 Servidor teste rodando: http://localhost:3000');
});