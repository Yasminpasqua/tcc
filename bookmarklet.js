// INCLUA-AI BOOKMARKLET - VERSÃO MINIFICADA
// Para usar: copie todo o código abaixo e cole como URL de um novo bookmark

// VERSÃO PRODUÇÃO (Render):
javascript:(function(){if(document.getElementById('inclua-ai-widget')){alert('Inclua-AI já está ativo nesta página!');return;}var css=document.createElement('link');css.rel='stylesheet';css.href='https://inclua.187-41-102-56.sslip.io/widget.css';document.head.appendChild(css);var script=document.createElement('script');script.src='https://inclua.187-41-102-56.sslip.io/widget.js';script.onload=function(){console.log('✅ Inclua-AI Widget carregado com sucesso!');};script.onerror=function(){alert('❌ Erro ao carregar Inclua-AI. Verifique sua conexão.');};document.head.appendChild(script);})();

// VERSÃO LOCAL (Desenvolvimento):
javascript:(function(){if(document.getElementById('inclua-ai-widget')){alert('Inclua-AI já está ativo nesta página!');return;}var css=document.createElement('link');css.rel='stylesheet';css.href='http://localhost:3000/widget.css';document.head.appendChild(css);var script=document.createElement('script');script.src='http://localhost:3000/widget.js';script.onload=function(){console.log('✅ Inclua-AI Widget carregado com sucesso!');};script.onerror=function(){alert('❌ Erro ao carregar Inclua-AI. Verifique se o servidor local está rodando.');};document.head.appendChild(script);})();

// VERSÃO EXPANDIDA PARA ENTENDIMENTO:
javascript:(function() {
    // Verificar se o widget já está ativo
    if (document.getElementById('inclua-ai-widget')) {
        alert('Inclua-AI já está ativo nesta página!');
        return;
    }
    
    // Carregar CSS do widget
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://inclua.187-41-102-56.sslip.io/widget.css';
    document.head.appendChild(css);
    
    // Carregar JavaScript do widget
    var script = document.createElement('script');
    script.src = 'https://inclua.187-41-102-56.sslip.io/widget.js';
    
    script.onload = function() {
        console.log('✅ Inclua-AI Widget carregado com sucesso!');
    };
    
    script.onerror = function() {
        alert('❌ Erro ao carregar Inclua-AI. Verifique sua conexão.');
    };
    
    document.head.appendChild(script);
})();
