// INCLUA-AI BOOKMARKLET AVANÇADO - COM FALLBACK E DETECÇÃO
javascript:(function(){
    // Verificações iniciais
    if (document.getElementById('inclua-ai-widget')) {
        if (confirm('Inclua-AI já está ativo! Deseja recarregar o widget?')) {
            document.getElementById('inclua-ai-widget').remove();
        } else {
            return;
        }
    }
    
    // Configuração de servidores (produção e desenvolvimento)
    const servers = [
        'https://inclua.187-41-102-56.sslip.io',
        'http://localhost:3000'
    ];
    
    let currentServerIndex = 0;
    
    // Função para carregar do servidor
    function loadFromServer(serverUrl) {
        console.log(`🔄 Tentando carregar Inclua-AI de: ${serverUrl}`);
        
        // Carregar CSS
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = `${serverUrl}/widget.css`;
        css.onerror = () => console.warn(`❌ CSS falhou: ${serverUrl}`);
        document.head.appendChild(css);
        
        // Carregar JavaScript
        const script = document.createElement('script');
        script.src = `${serverUrl}/widget.js`;
        
        script.onload = function() {
            console.log(`✅ Inclua-AI carregado com sucesso de: ${serverUrl}`);
            
            // Adicionar indicador visual de carregamento
            const indicator = document.createElement('div');
            indicator.innerHTML = '🚀 Inclua-AI carregado!';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #059669;
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                font-family: -apple-system, sans-serif;
                font-weight: 600;
                z-index: 999999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease-out;
            `;
            
            // Adicionar animação CSS
            if (!document.getElementById('inclua-ai-animations')) {
                const style = document.createElement('style');
                style.id = 'inclua-ai-animations';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(indicator);
            
            // Remover indicador após 3 segundos
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.remove();
                }
            }, 3000);
        };
        
        script.onerror = function() {
            console.warn(`❌ JavaScript falhou: ${serverUrl}`);
            
            // Tentar próximo servidor
            currentServerIndex++;
            if (currentServerIndex < servers.length) {
                setTimeout(() => loadFromServer(servers[currentServerIndex]), 1000);
            } else {
                // Mostrar erro final
                const errorMsg = document.createElement('div');
                errorMsg.innerHTML = `
                    <div style="margin-bottom: 10px;">❌ Falha ao carregar Inclua-AI</div>
                    <div style="font-size: 12px; opacity: 0.8;">Servidores testados: ${servers.join(', ')}</div>
                `;
                errorMsg.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #dc2626;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    font-family: -apple-system, sans-serif;
                    z-index: 999999;
                    max-width: 300px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                `;
                document.body.appendChild(errorMsg);
                
                setTimeout(() => errorMsg.remove(), 5000);
            }
        };
        
        document.head.appendChild(script);
    }
    
    // Começar o carregamento
    loadFromServer(servers[currentServerIndex]);
    
    // Log de debug
    console.log('📖 Inclua-AI Bookmarklet iniciado');
    console.log('🎯 Servidores disponíveis:', servers);
    
})();
