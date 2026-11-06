/**
 * INCLUA-AI WIDGET - SENIOR DEV EDITION
 * Sistema completo de acessibilidade com IA
 * Arquitetura robusta, acessível e resiliente.
 */

// Origem de onde este script foi carregado (ex.: http://localhost:8080 ao usar o favorito local)
const INCLUA_SCRIPT_ORIGIN = (() => {
    try { return document.currentScript && document.currentScript.src ? new URL(document.currentScript.src).origin : null; }
    catch { return null; }
})();

class IncluaAIWidget {
    constructor() {
        this.isActive = false;
        this.features = {
            reader: false,
            highlightLinks: false,
            imageDescriber: false,
            textSummarizer: false,
            librasHover: false
        };

        this.settings = {
            // Ajustes Visuais
            fontSize: 0,
            colorFilter: 'none',
            highlightLinks: false,
            highlightLinksColor: '#ffff00',

            // Assistente de Leitura
            textReader: false,
            hoverReader: false,

            // IA
            imageDescriber: false,
            textSummarizer: false,
            didacticSummary: false,
            didacticStyle: 'topicos',
            textToImage: false,
            chatSpeak: true,

            // Libras
            librasHover: false,
            librasRequest: false,
            librasRequests: [],

            // Novas funcionalidades
            voiceCommands: false,
            focusMode: false,
            focusModeImages: false,
            focusModePlain: false
        };

        this.currentSpeech = null;
        this.focusTrap = null;
        this.activeModal = null;

        // Voice Recognition
        this.speechRecognition = null;
        this.isListening = false;

        // Loading states
        this.loadingStates = new Map();
        this.loadingIndicator = null;

        // Hover reader indicator
        this.hoverIndicator = null;
        this.isReading = false;

        this.init();

        // Bind dos métodos para preservar referência
        this.boundHandleTextSelection = this.handleTextSelection.bind(this);
        this.boundHandleImageClick = this.handleImageClick.bind(this);
        this.boundHandleTextSummarization = this.handleTextSummarization.bind(this);
        this.boundHandleHover = this.handleHover.bind(this);
        // Evita repetir o resumo/imagem em loop enquanto o mesmo texto continua selecionado
        this.lastSelectionHandled = '';
        // Avisa se algum pedido de Libras ficou pronto desde a última visita
        setTimeout(() => this.checkLibrasReady(), 4000);
        document.addEventListener('selectionchange', () => {
            if (!window.getSelection().toString().trim()) this.lastSelectionHandled = '';
        });
        this.boundHandleHoverOut = this.handleHoverOut.bind(this);
        this.hoverTimeout = null;

        // Binds para Libras
        this.boundHandleLibrasHover = this.handleLibrasHover.bind(this);
        this.boundHandleLibrasHoverOut = this.handleLibrasHoverOut.bind(this);
        this.librasHoverTimeout = null;
        this.currentLibrasTarget = null;
        this.currentOriginalText = null;
        this.currentLibrasGlosa = null;
    }

    init() {
        if (!this.checkBrowserCompatibility()) {
            console.error('Navegador não suportado.');
            return;
        }

        this.loadSettings();
        this.createWidget();
        this.setupEventListeners();
        this.setupKeyboardNavigation(); // Sistema de navegação por teclado e atalhos
        this.injectSVGFilters();
        this.injectCategoryStyles(); // Estilos do novo design de categorias
        this.setupVoices();
        this.checkApiHealth();
        this.setupErrorHandling();

        // Expor instância globalmente para handlers inline
        window.incluaAIWidget = this;
    }

    // ==========================================================================
    // ARCHITECTURE & UTILS
    // ==========================================================================

    checkBrowserCompatibility() {
        return 'fetch' in window && 'speechSynthesis' in window;
    }

    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Erro Global:', event.error);
        });
    }

    async checkApiHealth() {
        try {
            const response = await this.fetchWithRetry(`${this.getApiBaseUrl()}/health`);
            if (response.ok) {
                this.updateStatusBadge('online');
            }
        } catch (error) {
            console.warn('API Offline:', error);
            this.updateStatusBadge('offline');
        }
    }

    updateStatusBadge(status) {
        // Status badge removido visualmente, mas mantido lógica interna se necessário
    }

    // Retry Logic com Exponential Backoff
    async fetchWithRetry(url, options = {}, retries = 3, backoff = 300) {
        try {
            const response = await this.fetchWithTimeout(url, options);
            if (!response.ok && response.status >= 500 && retries > 0) {
                throw new Error(`Server Error: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (retries > 0) {
                await new Promise(r => setTimeout(r, backoff));
                return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
            }
            throw error;
        }
    }

    async fetchWithTimeout(url, options = {}, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    getApiBaseUrl() {
        if (INCLUA_SCRIPT_ORIGIN) return INCLUA_SCRIPT_ORIGIN;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        }
        return 'https://inclua-ai-servidor.onrender.com';
    }

    // ==========================================================================
    // UI COMPONENTS & TOAST SYSTEM
    // ==========================================================================

    createWidget() {
        const widgetHTML = `
            <div id="inclua-ai-widget">
                <div class="toast-container" id="inclua-ai-toasts"></div>
                
                <button id="inclua-ai-toggle" aria-label="Abrir assistente de acessibilidade" aria-expanded="false" aria-controls="inclua-ai-panel">
                    <svg id="inclua-ai-toggle-icon" viewBox="0 0 100 100" style="width: 50px; height: 50px; margin: auto;">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#000" stroke-width="5"/>
                        <circle cx="50" cy="27" r="10" fill="#00E5FF" stroke="#000" stroke-width="5"/>
                        <path d="M 12 40 Q 50 75 88 40" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>
                        <path d="M 50 55 L 30 85 M 50 55 L 70 85" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="40" r="4" fill="#00E5FF" stroke="#000" stroke-width="5"/>
                        <circle cx="88" cy="40" r="4" fill="#00E5FF" stroke="#000" stroke-width="5"/>
                        <circle cx="30" cy="85" r="4" fill="#00E5FF" stroke="#000" stroke-width="5"/>
                        <circle cx="70" cy="85" r="4" fill="#00E5FF" stroke="#000" stroke-width="5"/>
                    </svg>
                </button>
                
                <div id="inclua-ai-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" hidden>
                    <div class="panel-header">
                        <div class="header-content">
                            <h2 id="panel-title">Inclua-AI</h2>
                            <p>Assistente de Acessibilidade Inteligente</p>
                        </div>
                    </div>
                    <div class="panel-content">
                        ${this.createPanelSections()}
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }


    createPanelSections() {
        return `
            ${this.createCategory('visual', '', 'Deficiência Visual', '#3b82f6', [
            { id: 'font-increase', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><text x="2" y="18" font-size="14" font-weight="bold">A+</text></svg>', title: 'Aumentar Fonte', desc: 'Fonte maior', key: 'Alt+Shift+F' },
            { id: 'font-decrease', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><text x="2" y="18" font-size="14" font-weight="bold">A-</text></svg>', title: 'Diminuir Fonte', desc: 'Fonte menor', key: 'Alt+Shift+G' },
            { id: 'highlight-links', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>', title: 'Destacar Links', desc: 'Realce em links', key: 'Alt+Shift+L', colorSelect: [{value:'#ffff00',label:'🟡 Amarelo'},{value:'#00eaff',label:'🔵 Ciano'},{value:'#ff6b6b',label:'🔴 Vermelho'},{value:'#69ff69',label:'🟢 Verde'},{value:'#ff9f43',label:'🟠 Laranja'},{value:'#a29bfe',label:'🟣 Roxo'},{value:'#ffffff',label:'⚪ Branco'}] },
            { id: 'text-reader', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>', title: 'Leitor de Texto', desc: 'Selecione para ouvir', key: 'Alt+Shift+R' },
            { id: 'hover-reader', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', title: 'Leitor de Tela', desc: 'Passe o mouse para ouvir', key: 'Alt+Shift+E' },
            { id: 'describe-image', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>', title: 'Descrever Imagem', desc: 'IA descreve imagens', key: 'Alt+Shift+I' }
        ])}

            <div class="category-colorblind">
                <div class="colorblind-label"> Filtros de Daltonismo</div>
                <select id="colorblind-filter" class="colorblind-select">
                    <option value="none">Nenhum filtro</option>
                    <option value="protanopia">Protanopia (Vermelho-Verde)</option>
                    <option value="deuteranopia">Deuteranopia (Verde-Vermelho)</option>
                    <option value="tritanopia">Tritanopia (Azul-Amarelo)</option>
                    <option value="achromatopsia">Acromatopsia (Sem cores)</option>
                </select>
            </div>


${this.createCategory('auditiva', '', 'Deficiência Auditiva', '#10b981', [
            { id: 'libras-hover', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a6 6 0 0 0-12 0v5"/><path d="M2 16s2-4 10-4 10 4 10 4"/><path d="M8 16v5"/><path d="M16 16v5"/></svg>', title: 'Traduzir Libras', desc: 'Avatar traduz ao passar o mouse', key: 'Alt+Shift+B' },
            { id: 'libras-request', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 8v5"/><path d="M9.5 10.5L12 8l2.5 2.5"/></svg>', title: 'Libras por Pedido', desc: 'Pedir tradução de um texto', key: 'Alt+Shift+P' },
            { id: 'libras-my-requests', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4-2.5z"/></svg>', title: 'Meus Pedidos de Libras', desc: 'Ver vídeos prontos', key: 'Alt+Shift+Q' }
        ])}

            ${this.createCategory('cognitiva', '', 'Dificuldades Cognitivas', '#8b5cf6', [
            { id: 'didactic-summary', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h8"/></svg>', title: 'Resumo Didático', desc: 'Texto educacional', key: 'Alt+Shift+D', styleSelect: [{value:'topicos',label:'📌 Tópicos'},{value:'historia',label:'📖 História'},{value:'curto',label:'⚡ Resumo curto'},{value:'simples',label:'🧒 Bem simples'},{value:'passo',label:'🪜 Passo a passo'},{value:'perguntas',label:'❓ Perguntas e respostas'},{value:'analogia',label:'💡 Com analogia'}] },
            { id: 'summarize-text', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>', title: 'Resumir Texto', desc: 'Resumo rápido', key: 'Alt+Shift+S' },
            { id: 'text-to-image', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><path d="M17 6l.7 1.5 1.5.7-1.5.7L17 10.4l-.7-1.5-1.5-.7 1.5-.7z"/></svg>', title: 'Imagem do Texto', desc: 'Gera imagem do texto', key: 'Alt+Shift+T' },
            { id: 'focus-mode-plain', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>', title: 'Foco', desc: 'Foco no conteúdo', key: 'Alt+Shift+O' },
            { id: 'focus-mode', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="4" y1="4" x2="8" y2="8"/><line x1="20" y1="4" x2="16" y2="8"/></svg>', title: 'Foco Sem Imagens', desc: 'Foco só no texto', key: 'Alt+Shift+C' },
            { id: 'focus-mode-images', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><rect x="3" y="3" width="7" height="5" rx="1"/></svg>', title: 'Foco Com Imagens', desc: 'Foco só nas imagens', key: 'Alt+Shift+M' }
        ])}

            ${this.createSection('Assistência Virtual', [
            { id: 'chatbot', emoji: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M9 14s1 2 3 2 3-2 3-2"/></svg>', title: 'ChatBot Assistente', desc: 'Converse com IA', key: 'Alt+Shift+H' },
        ])}

            <div class="menu-footer">
                <button class="reset-button" data-action="reset-settings">
                    <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg></span> Resetar Configurações
                </button>
            </div>
        `;
    }

    createCategory(id, icon, title, color, items) {
        const cards = items.map(item => {
            const sel = item.colorSelect
                ? { id: 'link-highlight-color', label: 'Cor do destaque', opts: item.colorSelect }
                : item.styleSelect ? { id: 'didactic-style', label: 'Estilo do resumo', opts: item.styleSelect } : null;
            if (sel) {
                const options = sel.opts.map(o =>
                    `<option value="${o.value}">${o.label}</option>`
                ).join('');
                return `
                    <div class="feature-card" role="button" tabindex="0"
                            data-action="${item.id}"
                            data-category="${id}"
                            aria-label="${item.title}: ${item.desc}. Estado: Desligado. ${item.key ? 'Atalho: ' + item.key : ''}">
                        <div class="active-check">✓</div>
                        ${item.key ? `<div class="card-shortcut">${item.key}</div>` : ''}
                        <div class="card-icon">${item.emoji}</div>
                        <div class="card-label">${item.title}</div>
                        <select class="link-highlight-select" id="${sel.id}" aria-label="${sel.label}">
                            ${options}
                        </select>
                    </div>
                `;
            }
            return `
            <button class="feature-card"
                    data-action="${item.id}"
                    data-category="${id}"
                    aria-label="${item.title}: ${item.desc}. Estado: Desligado. ${item.key ? 'Atalho: ' + item.key : ''}">
                <div class="active-check">✓</div>
                ${item.key ? `<div class="card-shortcut">${item.key}</div>` : ''}
                <div class="card-icon">${item.emoji}</div>
                <div class="card-label">${item.title}</div>
                <div class="card-status">OFF</div>
            </button>
        `;
        }).join('');

        return `
            <div class="acess-category" data-category="${id}" style="--category-color: ${color}">
                <div class="category-header">
                    <span class="category-icon">${icon}</span>
                    <span class="category-title">${title}</span>
                </div>
                <div class="category-grid">
                    ${cards}
                </div>
            </div>
        `;
    }

    createSection(title, items) {
        const cards = items.map(item => `
            <button class="feature-card" 
                    data-action="${item.id}"
                    aria-label="${item.title}: ${item.desc}. ${item.key ? 'Atalho: ' + item.key : ''}">
                <div class="active-check">✓</div>
                ${item.key ? `<div class="card-shortcut">${item.key}</div>` : ''}
                <div class="card-icon">${item.emoji}</div>
                <div class="card-label">${item.title}</div>
                <div class="card-status">OFF</div>
            </button>
        `).join('');

        return `
            <div class="acess-category" style="--category-color: #6366f1">
                <div class="category-header">
                    <span class="category-icon"></span>
                    <span class="category-title">${title}</span>
                </div>
                <div class="category-grid">
                    ${cards}
                </div>
            </div>
        `;
    }


    // ==========================================================================
    // TOAST NOTIFICATION SYSTEM
    // ==========================================================================

    showToast(message, type = 'info') {
        // Com o chat aberto, o aviso aparece à esquerda dele (senão ficaria escondido atrás)
        const container = this.getChatToastContainer() || document.getElementById('inclua-ai-toasts');
        if (!container) return;
        if (container.id === 'inclua-ai-toasts') this.positionToastContainer(container);

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = '';
        switch (type) {
            case 'success': icon = '<path d="M20 6L9 17l-5-5"/>'; break;
            case 'error': icon = '<path d="M18 6L6 18M6 6l12 12"/>'; break;
            case 'warning': icon = '<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'; break;
            default: icon = '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>';
        }

        toast.innerHTML = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${icon}
            </svg>
            <span>${message}</span>
        `;

        // Modo "um por vez": tira os avisos antigos para não empilhar por cima do painel
        if (container.dataset.mode === 'single') container.querySelectorAll('.toast').forEach(t => t.remove());
        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => toast.remove());
        }, 4000);
    }

    // Avisos ficam ao lado do ícone do assistente, embaixo (na faixa entre o ícone e o painel aberto)
    positionToastContainer(container) {
        const toggle = document.getElementById('inclua-ai-toggle');
        const tr = toggle && toggle.getBoundingClientRect();
        if (!tr || !tr.width) return;
        const vw = window.innerWidth, vh = window.innerHeight, gap = 12;
        const base = 'position:fixed;display:flex;flex-direction:column;justify-content:flex-end;gap:12px;pointer-events:none;';
        const panel = document.getElementById('inclua-ai-panel');
        const panelOpen = !!(this.isActive && panel && !panel.hidden);

        const onRight = (tr.left + tr.width / 2) > vw / 2;
        const room = onRight ? tr.left - gap - 16 : vw - tr.right - gap - 16;

        if (room >= 200) {
            const side = onRight ? `right:${Math.round(vw - tr.left + gap)}px;` : `left:${Math.round(tr.right + gap)}px;`;
            // Painel aberto: desce até o rodapé e mostra um aviso por vez, para caber abaixo do painel
            const bottom = panelOpen ? 12 : Math.max(12, Math.round(vh - tr.bottom));
            container.style.cssText = base + `bottom:${bottom}px;width:${Math.min(380, Math.round(room))}px;` + side;
            container.dataset.mode = panelOpen ? 'single' : 'side';
        } else {
            // Tela estreita demais: no topo, centralizado
            container.style.cssText = base + `top:12px;left:50%;transform:translateX(-50%);width:${Math.min(380, vw - 32)}px;`;
            container.dataset.mode = 'single';
        }
    }

    getChatToastContainer() {
        const overlay = document.getElementById('chatbot-modal');
        const dialog = overlay && overlay.querySelector('.inclua-chat-dialog');
        if (!dialog) return null;
        let box = overlay.querySelector('#inclua-chat-toasts');
        if (!box) {
            box = document.createElement('div');
            box.id = 'inclua-chat-toasts';
            box.setAttribute('aria-live', 'polite');
            overlay.appendChild(box);
        }
        const r = dialog.getBoundingClientRect();
        const room = r.left - 32; // espaço livre à esquerda do chat
        if (room >= 220) {
            box.style.cssText = `position:fixed;z-index:2;display:flex;flex-direction:column;gap:12px;pointer-events:none;top:${Math.max(12, r.top)}px;left:16px;width:${Math.min(380, room)}px;`;
        } else {
            // Tela estreita: não cabe ao lado, então fica no topo, por cima
            box.style.cssText = `position:fixed;z-index:2;display:flex;flex-direction:column;gap:12px;pointer-events:none;top:12px;left:50%;transform:translateX(-50%);width:${Math.min(380, window.innerWidth - 32)}px;`;
        }
        return box;
    }

    showAlert(message, type = 'info') {
        // Fallback para manter compatibilidade, mas redireciona para Toast
        this.showToast(message, type);
    }

    // ==========================================================================
    // LOADING STATE SYSTEM
    // ==========================================================================

    showLoading(action, message = 'Processando...') {
        this.loadingStates.set(action, true);
        
        // Cria ou atualiza indicador de loading
        if (!this.loadingIndicator) {
            const loadingHTML = `
                <div id="inclua-loading-indicator" class="loading-overlay">
                    <div class="loading-content">
                        <div class="loading-spinner">
                            <div class="spinner-ring"></div>
                            <div class="spinner-ring"></div>
                            <div class="spinner-ring"></div>
                        </div>
                        <div class="loading-text">Processando...</div>
                        <div class="loading-subtext">Aguarde um momento</div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', loadingHTML);
            this.loadingIndicator = document.getElementById('inclua-loading-indicator');
            this.injectLoadingStyles();
        }
        
        const textElement = this.loadingIndicator.querySelector('.loading-text');
        if (textElement) textElement.textContent = message;
        
        this.loadingIndicator.classList.add('show');
    }

    hideLoading(action) {
        this.loadingStates.delete(action);
        
        // Se não há mais estados de loading, esconde o indicador
        if (this.loadingStates.size === 0 && this.loadingIndicator) {
            this.loadingIndicator.classList.remove('show');
        }
    }

    injectLoadingStyles() {
        if (document.getElementById('inclua-loading-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'inclua-loading-styles';
        styles.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .loading-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            .loading-content {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                padding: 40px 50px;
                border-radius: 24px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                text-align: center;
                border: 2px solid rgba(59, 130, 246, 0.3);
                animation: loadingSlideIn 0.3s ease;
            }

            @keyframes loadingSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(20px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .loading-spinner {
                position: relative;
                width: 80px;
                height: 80px;
                margin: 0 auto 24px;
            }

            .spinner-ring {
                position: absolute;
                width: 100%;
                height: 100%;
                border: 4px solid transparent;
                border-radius: 50%;
                animation: spinnerRotate 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
            }

            .spinner-ring:nth-child(1) {
                border-top-color: #3b82f6;
                animation-delay: -0.45s;
            }

            .spinner-ring:nth-child(2) {
                border-top-color: #8b5cf6;
                animation-delay: -0.3s;
            }

            .spinner-ring:nth-child(3) {
                border-top-color: #10b981;
                animation-delay: -0.15s;
            }

            @keyframes spinnerRotate {
                0% {
                    transform: rotate(0deg);
                }
                100% {
                    transform: rotate(360deg);
                }
            }

            .loading-text {
                color: #f1f5f9;
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 8px;
                font-family: 'Inter', sans-serif;
            }

            .loading-subtext {
                color: #94a3b8;
                font-size: 14px;
                font-weight: 500;
            }
        `;
        document.head.appendChild(styles);
    }

    // ==========================================================================
    // FOCUS TRAP & ACCESSIBILITY
    // ==========================================================================

    togglePanel() {
        this.isActive = !this.isActive;
        const panel = document.getElementById('inclua-ai-panel');
        const toggle = document.getElementById('inclua-ai-toggle');

        toggle.classList.toggle('active', this.isActive);
        toggle.setAttribute('aria-expanded', this.isActive);

        if (this.isActive) {
            panel.hidden = false;
            // Pequeno delay para permitir animação CSS
            requestAnimationFrame(() => {
                panel.classList.add('show');
                this.trapFocus(panel);
            });
        } else {
            panel.classList.remove('show');
            panel.addEventListener('transitionend', () => {
                if (!this.isActive) panel.hidden = true;
            }, { once: true });
            this.releaseFocus();
        }
    }

    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        this.focusTrap = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            } else if (e.key === 'Escape') {
                this.togglePanel();
            }
        };

        element.addEventListener('keydown', this.focusTrap);
        firstElement?.focus();
    }

    releaseFocus() {
        const panel = document.getElementById('inclua-ai-panel');
        if (panel && this.focusTrap) {
            panel.removeEventListener('keydown', this.focusTrap);
            this.focusTrap = null;
        }
        document.getElementById('inclua-ai-toggle').focus();
    }

    // ==========================================================================
    // EVENT LISTENERS & ACTIONS
    // ==========================================================================

    setupEventListeners() {
        const toggle = document.getElementById('inclua-ai-toggle');
        toggle.addEventListener('click', () => this.togglePanel());

        const panel = document.getElementById('inclua-ai-panel');
        panel.addEventListener('click', (e) => {
            if (e.target.closest('.link-highlight-select')) return;
            const button = e.target.closest('.feature-button, .feature-card, .reset-button');
            if (button) {
                const action = button.dataset.action;
                this.handleAction(action, button);
            }
        });

        panel.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const card = e.target.closest('.feature-card[role="button"]');
                if (card && !e.target.closest('.link-highlight-select')) {
                    e.preventDefault();
                    this.handleAction(card.dataset.action, card);
                }
            }
        });

        const colorblindFilter = document.getElementById('colorblind-filter');
        if (colorblindFilter) {
            colorblindFilter.addEventListener('change', (e) => this.applyColorblindFilter(e.target.value));
        }

        const linkHighlightSelect = document.getElementById('link-highlight-color');
        if (linkHighlightSelect) {
            linkHighlightSelect.value = this.settings.highlightLinksColor || '#ffff00';
            linkHighlightSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                this.applyHighlightLinksColor(e.target.value);
            });
        }

        const didacticStyleSelect = document.getElementById('didactic-style');
        if (didacticStyleSelect) {
            didacticStyleSelect.value = this.settings.didacticStyle || 'topicos';
            didacticStyleSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                this.settings.didacticStyle = e.target.value;
                this.saveSettings();
                this.showToast('Estilo do resumo: ' + e.target.selectedOptions[0].textContent, 'success');
            });
        }

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (this.isActive && !e.target.closest('#inclua-ai-widget')) {
                this.togglePanel();
            }
        });
    }

    async handleAction(action, button) {
        button.classList.add('processing');
        try {
            switch (action) {
                case 'font-increase': this.adjustFontSize(1); break;
                case 'font-decrease': this.adjustFontSize(-1); break;
                case 'highlight-links': this.toggleHighlightLinks(); break;
                case 'text-reader': this.toggleTextReader(); break;
                case 'hover-reader': this.toggleHoverReader(); break;
                case 'describe-image': this.toggleImageDescriber(); break;
                case 'summarize-text': this.toggleTextSummarizer(); break;
                case 'didactic-summary': this.toggleDidacticSummary(); break;
                case 'text-to-image': this.toggleTextToImage(); break;
                case 'libras-hover': this.toggleLibrasHover(); break;
                case 'libras-request': this.toggleLibrasRequest(); break;
                case 'libras-my-requests': this.openLibrasRequests(); break;
                case 'voice-commands': this.toggleVoiceCommands(); break;
                case 'focus-mode-plain': this.toggleFocusMode('plain'); break;
                case 'focus-mode': this.toggleFocusMode('no-images'); break;
                case 'focus-mode-images': this.toggleFocusMode('images'); break;
                case 'chatbot': this.openChatbot(); break;
                case 'reset-settings': this.resetSettings(); break;
            }

            // Atualiza visual do botão após ação
            this.updateButtonVisuals(button);

        } catch (error) {
            this.showToast('Erro ao executar ação. Tente novamente.', 'error');
        } finally {
            setTimeout(() => button.classList.remove('processing'), 500);
        }
    }

    updateButtonVisuals(button) {
        // Verifica estado real baseada na ação
        let isActive = false;
        const action = button.dataset.action;

        // Lógica de estado para cada feature
        if (action === 'highlight-links') isActive = document.body.classList.contains('inclua-highlight-links');
        if (action === 'text-reader') isActive = this.settings.textReader;
        if (action === 'hover-reader') isActive = this.settings.hoverReader;
        if (action === 'describe-image') isActive = this.settings.imageDescriber;
        if (action === 'summarize-text') isActive = this.settings.textSummarizer;
        if (action === 'didactic-summary') isActive = this.settings.didacticSummary;
        if (action === 'text-to-image') isActive = this.settings.textToImage;
        if (action === 'libras-hover') isActive = this.settings.librasHover;
        if (action === 'libras-request') isActive = this.settings.librasRequest;
        if (action === 'voice-commands') isActive = this.settings.voiceCommands;
        if (action === 'focus-mode-plain') isActive = this.settings.focusModePlain;
        if (action === 'focus-mode') isActive = this.settings.focusMode;
        if (action === 'focus-mode-images') isActive = this.settings.focusModeImages;

        // Aplica classes e textos
        if (isActive) {
            button.classList.add('active');
            const status = button.querySelector('.card-status');
            if (status) status.textContent = 'ON';
            button.setAttribute('aria-pressed', 'true');

            // Atualiza label para leitor de tela
            const currentLabel = button.getAttribute('aria-label') || '';
            button.setAttribute('aria-label', currentLabel.replace('Desligado', 'Ligado'));
        } else {
            // Apenas remove se for toggle, botões de ação momentânea (como fonte) não mantêm estado
            if (!['font-increase', 'font-decrease', 'reset-settings'].includes(action)) {
                button.classList.remove('active');
                const status = button.querySelector('.card-status');
                if (status) status.textContent = 'OFF';
                button.setAttribute('aria-pressed', 'false');

                const currentLabel = button.getAttribute('aria-label') || '';
                button.setAttribute('aria-label', currentLabel.replace('Ligado', 'Desligado'));
            }
        }
    }

    // ==========================================================================
    // NAVEGAÇÃO POR TECLADO E ATALHOS
    // ==========================================================================

    setupKeyboardNavigation() {
        // Atalhos globais e teclas de função
        document.addEventListener('keydown', (e) => {
            // Alt+A: Toggle widget
            if (e.altKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                this.togglePanel();
                this.announceToScreenReader('Menu de acessibilidade ' + (this.isActive ? 'aberto' : 'fechado'));
                return;
            }

            // Esc: Fechar painel se estiver aberto
            if (e.key === 'Escape' && this.isActive) {
                this.togglePanel();
                return;
            }

            // Atalhos Alt+Shift+letra
            this.handleFunctionKeys(e);

            // Navegação por setas quando painel aberto
            if (this.isActive && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                this.navigateButtons(e);
            }
        });

        // Melhorar navegação por Tab nos botões
        this.enhanceButtonNavigation();
    }

    handleFunctionKeys(e) {
        if (!e.altKey || !e.shiftKey) return;

        const key = e.key.toLowerCase();
        const shortcutMap = {
            '?': () => this.showHelpScreen(),
            'f': () => this.triggerAction('font-increase', 'Aumentar fonte'),
            'g': () => this.triggerAction('font-decrease', 'Diminuir fonte'),
            'l': () => this.triggerAction('highlight-links', 'Destacar links'),
            'r': () => this.triggerAction('text-reader', 'Leitor de texto'),
            'e': () => this.triggerAction('hover-reader', 'Ler ao passar mouse'),
            'i': () => this.triggerAction('describe-image', 'Descrever imagem'),
            's': () => this.triggerAction('summarize-text', 'Resumir texto'),
            'b': () => this.triggerAction('libras-hover', 'Libras ao hover'),
            'd': () => this.triggerAction('didactic-summary', 'Resumo didático'),
            't': () => this.triggerAction('text-to-image', 'Imagem do texto'),
            'p': () => this.triggerAction('libras-request', 'Libras por pedido'),
            'q': () => this.triggerAction('libras-my-requests', 'Meus pedidos de Libras'),
            'h': () => this.triggerAction('chatbot', 'Assistente'),
            'o': () => this.triggerAction('focus-mode-plain', 'Foco'),
            'c': () => this.triggerAction('focus-mode', 'Foco sem imagens'),
            'm': () => this.triggerAction('focus-mode-images', 'Foco com imagens'),
            'v': () => this.triggerAction('voice-commands', 'Controle por voz')
        };

        if (shortcutMap[key]) {
            e.preventDefault();
            shortcutMap[key]();
        }
    }

    triggerAction(action, name) {
        const button = document.querySelector(`[data-action="${action}"]`);
        if (button) {
            this.handleAction(action, button);
            this.announceToScreenReader(`${name} ativado`);
        }
    }

    navigateButtons(e) {
        e.preventDefault();
        const buttons = Array.from(document.querySelectorAll('.feature-card, .feature-button'));
        const currentIndex = buttons.findIndex(btn => btn === document.activeElement);

        let nextIndex;
        if (e.key === 'ArrowDown') {
            nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
        }

        buttons[nextIndex]?.focus();
    }

    enhanceButtonNavigation() {
        // Adicionar suporte a Enter/Space para ativar botões
        const panel = document.getElementById('inclua-ai-panel');
        panel.addEventListener('keydown', (e) => {
            const isFeatureElement = e.target.classList.contains('feature-button') ||
                e.target.classList.contains('feature-card');
            if ((e.key === 'Enter' || e.key === ' ') && isFeatureElement) {
                e.preventDefault();
                e.target.click();
            }
        });
    }

    showHelpScreen() {
        // Remove help screen anterior se existir
        const existingHelp = document.getElementById('inclua-help-screen');
        if (existingHelp) {
            existingHelp.remove();
            return; // Toggle: fecha se já estiver aberto
        }

        const helpHTML = `
            <div id="inclua-help-screen" class="help-screen" role="dialog" aria-labelledby="help-title" aria-modal="true">
                <div class="help-content">
                    <div class="help-header">
                        <h2 id="help-title">⌨️ Atalhos de Teclado</h2>
                        <button class="help-close" onclick="document.getElementById('inclua-help-screen').remove()" aria-label="Fechar ajuda">✕</button>
                    </div>
                    <div class="help-body">
                        <div class="help-section">
                            <h3>Atalhos Globais</h3>
                            <ul class="help-list">
                                <li><kbd>Alt</kbd>+<kbd>A</kbd> — Abrir/Fechar Menu</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>?</kbd> — Mostrar esta ajuda</li>
                                <li><kbd>Esc</kbd> — Fechar painel</li>
                            </ul>
                        </div>
                        <div class="help-section">
                            <h3>Funcionalidades (Alt+Shift+letra)</h3>
                            <ul class="help-list">
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> — Aumentar fonte</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> — Diminuir fonte</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> — Destacar links</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> — Leitor de texto</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> — Leitor ao hover</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> — Descrever imagem</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> — Resumir texto</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> — Libras ao hover</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> — Resumo didático</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> — Imagem do texto</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> — Libras por pedido</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>Q</kbd> — Meus pedidos de Libras</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd> — Assistente (chat por voz)</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd> — Foco</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> — Foco sem imagens</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> — Foco com imagens</li>
                                <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> — Controle por voz</li>
                            </ul>
                        </div>
                        <div class="help-section">
                            <h3>Comandos de Voz</h3>
                            <ul class="help-list">
                                <li>"aumentar" / "diminuir" - Fonte</li>
                                <li>"ler" / "parar" - Leitor</li>
                                <li>"foco" - Modo concentração</li>
                                <li>"resumir" / "libras" - Funções</li>
                                <li>"ajuda" - Ver comandos</li>
                            </ul>
                        </div>
                        <div class="help-section">
                            <h3>Navegação no Menu</h3>
                            <ul class="help-list">
                                <li><kbd>Tab</kbd> - Próximo elemento</li>
                                <li><kbd>Shift</kbd> + <kbd>Tab</kbd> - Elemento anterior</li>
                                <li><kbd>↑</kbd> - Botão anterior</li>
                                <li><kbd>↓</kbd> - Próximo botão</li>
                                <li><kbd>Enter</kbd> ou <kbd>Espaço</kbd> - Ativar</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', helpHTML);
        this.injectHelpStyles();

        // Foco no botão fechar
        document.querySelector('.help-close').focus();
        this.announceToScreenReader('Tela de ajuda aberta. Navegue com Tab para ver os atalhos');

        // Fechar com Esc ou Alt+Shift+?
        const helpScreen = document.getElementById('inclua-help-screen');
        const closeHelp = (e) => {
            if (e.key === 'Escape' || (e.altKey && e.shiftKey && e.key === '?')) {
                e.preventDefault();
                helpScreen.remove();
                document.removeEventListener('keydown', closeHelp);
            }
        };
        document.addEventListener('keydown', closeHelp);
    }

    announceToScreenReader(message) {
        // Criar região ARIA live se não existir
        let liveRegion = document.getElementById('inclua-aria-live');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'inclua-aria-live';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            document.body.appendChild(liveRegion);
        }

        liveRegion.textContent = message;

        // Limpar após 1 segundo
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }

    // ==========================================================================
    // FEATURES IMPLEMENTATION
    // ==========================================================================

    adjustFontSize(delta) {
        this.settings.fontSize = Math.max(-3, Math.min(5, this.settings.fontSize + delta));
        this.applyFontSize();
        this.saveSettings();
        const step = this.settings.fontSize;
        const label = step === 0
            ? 'Fonte no tamanho original'
            : step > 0
                ? `Fonte aumentada (+${step * 15}%)`
                : `Fonte reduzida (${step * 15}%)`;
        this.showToast(label, 'success');
    }

    applyFontSize() {
        // Remove marcações anteriores e restaura inline styles
        document.querySelectorAll('[data-inclua-orig-fs]').forEach(el => {
            const orig = el.dataset.incluaOrigFs;
            if (orig === '') {
                el.style.removeProperty('font-size');
            } else {
                el.style.fontSize = orig;
            }
            delete el.dataset.incluaOrigFs;
        });

        if (this.settings.fontSize === 0) return;

        const factor = 1 + (this.settings.fontSize * 0.15);

        // Seleciona apenas elementos que carregam texto diretamente
        const selector = [
            'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'li', 'dt', 'dd', 'td', 'th', 'caption', 'figcaption',
            'label', 'legend', 'blockquote', 'cite', 'summary',
            'a', 'button', 'span', 'strong', 'em', 'b', 'i', 'small',
            'input', 'textarea', 'select', 'option',
            'pre', 'code', 'kbd', 'abbr'
        ].join(', ');

        document.querySelectorAll(selector).forEach(el => {
            // Ignora o próprio widget e SVGs
            if (el.closest('#inclua-ai-widget')) return;
            if (el.closest('svg')) return;

            // Salva o inline style original (antes de qualquer mudança nossa)
            if (!el.hasAttribute('data-inclua-orig-fs')) {
                el.dataset.incluaOrigFs = el.style.fontSize || '';
            }

            // Lê o tamanho REAL em px (já calculado pelo browser, sem cascata)
            const computedPx = parseFloat(window.getComputedStyle(el).fontSize);
            if (!computedPx || isNaN(computedPx)) return;

            const newPx = Math.round(computedPx * factor * 10) / 10;
            el.style.setProperty('font-size', `${newPx}px`, 'important');
        });
    }



    toggleHighlightLinks() {
        this.settings.highlightLinks = !this.settings.highlightLinks;
        document.body.classList.toggle('inclua-highlight-links', this.settings.highlightLinks);
        this.applyHighlightLinksColor(this.settings.highlightLinksColor);

        // Atualiza visual
        const btn = document.querySelector('[data-action="highlight-links"]');
        if (btn) this.updateButtonVisuals(btn);

        this.showToast(`Destaque de links ${this.settings.highlightLinks ? 'ativado' : 'desativado'}`, 'success');
        this.saveSettings();
    }

    applyHighlightLinksColor(color) {
        this.settings.highlightLinksColor = color;
        document.body.style.setProperty('--inclua-link-highlight-color', color);
        document.body.style.setProperty('--inclua-link-highlight-shadow', color + 'cc');
        const select = document.getElementById('link-highlight-color');
        if (select) select.value = color;
        this.saveSettings();
    }

    toggleTextReader() {
        this.settings.textReader = !this.settings.textReader;

        // Atualiza visual
        const btn = document.querySelector('[data-action="text-reader"]');
        if (btn) this.updateButtonVisuals(btn);

        if (this.settings.textReader) {
            document.addEventListener('mouseup', this.boundHandleTextSelection);
            this.showToast('🔊 Leitor ativado: Selecione qualquer texto para ouvir', 'success');
            console.log('Leitor de texto ativado - Selecione texto para ler');
        } else {
            document.removeEventListener('mouseup', this.boundHandleTextSelection);
            speechSynthesis.cancel();
            this.showToast('Leitor de texto desativado', 'info');
            console.log('Leitor de texto desativado');
        }
    }

    handleTextSelection(event) {
        // Ignora seleções dentro do widget
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        if (range.startContainer.parentElement?.closest('#inclua-ai-widget')) return;
        
        const text = this.takeSelection(event, 1);
        if (text) {
            console.log('Texto selecionado para leitura:', text.substring(0, 50) + '...');
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onstart = () => {
                this.showToast('🔊 Lendo texto selecionado...', 'info');
            };
            
            utterance.onend = () => {
                // Leitura finalizada
            };
            
            utterance.onerror = (e) => {
                // Erro silencioso na síntese
            };
            
            speechSynthesis.speak(utterance);
        }
    }

    toggleHoverReader() {
        this.settings.hoverReader = !this.settings.hoverReader;

        // Atualiza visual
        const btn = document.querySelector('[data-action="hover-reader"]');
        if (btn) this.updateButtonVisuals(btn);

        if (this.settings.hoverReader) {
            document.addEventListener('mouseover', this.boundHandleHover);
            document.addEventListener('mouseout', this.boundHandleHoverOut);
            this.showToast('👆 Leitor de Tela ativado: Passe o mouse sobre textos', 'success');
            console.log('Leitor de tela (hover) ativado');
        } else {
            document.removeEventListener('mouseover', this.boundHandleHover);
            document.removeEventListener('mouseout', this.boundHandleHoverOut);
            clearTimeout(this.hoverTimeout);
            speechSynthesis.cancel();
            this.removeHighlight();
            this.hideHoverReadingIndicator();
            this.isReading = false;
            this.showToast('Leitor de tela desativado', 'info');
            console.log('Leitor de tela (hover) desativado');
        }
    }

    handleHover(e) {
        if (!this.settings.hoverReader) {
            console.log('Hover reader não está ativado');
            return;
        }
        
        if (this.activeModal || e.target.closest('#inclua-ai-widget')) return;
        if (e.target.closest('#inclua-hover-indicator') || e.target.closest('#inclua-loading-indicator')) return;

        // Elementos que devem ser lidos
        const readableTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A', 'BUTTON', 'LI', 'TD', 'TH', 'LABEL', 'DIV', 'ARTICLE', 'SECTION'];
        let target = e.target;

        // Procura o elemento mais apropriado para ler
        if (!readableTags.includes(target.tagName)) {
            target = target.closest(readableTags.map(t => t.toLowerCase()).join(','));
        }

        if (!target) return;

        // Para elementos inline (A, SPAN, BUTTON), lê apenas o elemento específico
        const inlineElements = ['A', 'BUTTON', 'LABEL', 'SPAN', 'STRONG', 'EM', 'B', 'I'];
        let text;
        
        if (inlineElements.includes(target.tagName)) {
            // Para links e botões, lê o texto específico + contexto
            text = target.innerText?.trim();
            if (target.tagName === 'A' && text) {
                text = `Link: ${text}`;
            } else if (target.tagName === 'BUTTON' && text) {
                text = `Botão: ${text}`;
            }
        } else {
            // Para blocos de texto, lê o conteúdo completo
            text = target.innerText?.trim();
        }

        // Validação: tem texto válido?
        if (!text || text.length === 0 || text.length > 5000) return;

        // Evita reler o mesmo elemento
        if (this.currentHighlighted === target) return;

        console.log('Hover sobre elemento:', target.tagName, '- Texto:', text.substring(0, 50) + '...');

        // Debounce para evitar leitura excessiva
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = setTimeout(() => {
            console.log('Iniciando leitura do texto...');
            this.highlightElement(target);
            this.showHoverReadingIndicator(target, text);

            // Cancela leitura anterior
            speechSynthesis.cancel();

            // Configura nova leitura
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = 1.1; // Um pouco mais rápido para melhor experiência
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
                
            utterance.onstart = () => { 
                this.isReading = true;
                this.updateHoverIndicator('🔊 Lendo...', 'reading');
                console.log('Leitura iniciada');
            };
                
            utterance.onend = () => { 
                this.currentSpeech = null;
                this.isReading = false;
                console.log('Leitura finalizada');
                // Não esconde o indicador imediatamente, deixa visível
            };

            utterance.onerror = (error) => {
                this.currentSpeech = null;
                this.isReading = false;
                // Erro silencioso na síntese
            };

            this.currentSpeech = utterance;
            speechSynthesis.speak(utterance);
        }, 300); // Delay reduzido para resposta mais rápida
    }

    handleHoverOut(e) {
        clearTimeout(this.hoverTimeout);
        speechSynthesis.cancel();
        this.removeHighlight();
        this.hideHoverReadingIndicator();
        this.isReading = false;
    }

    showHoverReadingIndicator(element, text = '') {
        if (!this.hoverIndicator) {
            const indicatorHTML = `
                <div id="inclua-hover-indicator" class="hover-reading-indicator">
                    <div class="indicator-icon">🔊</div>
                    <div class="indicator-content">
                        <div class="indicator-title">Leitor de Tela</div>
                        <div class="indicator-text">Preparando...</div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', indicatorHTML);
            this.hoverIndicator = document.getElementById('inclua-hover-indicator');
            this.injectHoverIndicatorStyles();
        }
        
        // Atualiza o texto do preview
        const textElement = this.hoverIndicator.querySelector('.indicator-text');
        if (textElement && text) {
            const preview = text.length > 60 ? text.substring(0, 60) + '...' : text;
            textElement.textContent = preview;
        }
        
        // Posiciona próximo ao elemento
        const rect = element.getBoundingClientRect();
        const indicatorHeight = 70; // Altura aproximada do indicador
        
        // Posiciona acima do elemento, mas verifica se cabe na tela
        let top = rect.top - indicatorHeight - 10;
        if (top < 10) {
            // Se não cabe acima, coloca abaixo
            top = rect.bottom + 10;
        }
        
        this.hoverIndicator.style.top = `${top}px`;
        this.hoverIndicator.style.left = `${rect.left}px`;
        this.hoverIndicator.classList.add('show');
    }

    updateHoverIndicator(text, state = 'ready') {
        if (!this.hoverIndicator) return;
        
        const textElement = this.hoverIndicator.querySelector('.indicator-text');
        if (textElement) textElement.textContent = text;
        
        this.hoverIndicator.className = `hover-reading-indicator show ${state}`;
    }

    hideHoverReadingIndicator() {
        if (this.hoverIndicator) {
            this.hoverIndicator.classList.remove('show');
        }
    }

    injectHoverIndicatorStyles() {
        if (document.getElementById('inclua-hover-indicator-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'inclua-hover-indicator-styles';
        styles.textContent = `
            .hover-reading-indicator {
                position: fixed;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                color: white;
                padding: 12px 16px;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(59, 130, 246, 0.3);
                z-index: 999998;
                font-family: 'Inter', sans-serif;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px) scale(0.95);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 12px;
                max-width: 400px;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }

            .hover-reading-indicator.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }

            .hover-reading-indicator.reading {
                background: linear-gradient(135deg, #065f46 0%, #047857 100%);
                box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4), 0 0 0 2px rgba(16, 185, 129, 0.5);
            }

            .indicator-icon {
                font-size: 24px;
                flex-shrink: 0;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            }

            .indicator-content {
                flex: 1;
                min-width: 0;
            }

            .indicator-title {
                font-size: 11px;
                font-weight: 700;
                color: rgba(255, 255, 255, 0.7);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }

            .indicator-text {
                color: white;
                font-size: 13px;
                font-weight: 500;
                line-height: 1.4;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }

            .hover-reading-indicator.reading .indicator-icon {
                animation: pulse 1.5s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
        `;
        document.head.appendChild(styles);
    }

    highlightElement(el) {
        this.removeHighlight();
        this.currentHighlighted = el;
        el.style.outline = '2px solid #2563eb';
        el.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
        el.style.transition = 'all 0.2s';
    }

    removeHighlight() {
        if (this.currentHighlighted) {
            this.currentHighlighted.style.outline = '';
            this.currentHighlighted.style.backgroundColor = '';
            this.currentHighlighted = null;
        }
    }

    toggleImageDescriber() {
        this.settings.imageDescriber = !this.settings.imageDescriber;

        // Atualiza visual
        const btn = document.querySelector('[data-action="describe-image"]');
        if (btn) this.updateButtonVisuals(btn);

        if (this.settings.imageDescriber) {
            document.addEventListener('click', this.boundHandleImageClick);
            document.body.style.cursor = 'help';
            this.showToast('Clique em uma imagem para descrição', 'info');
        } else {
            document.removeEventListener('click', this.boundHandleImageClick);
            document.body.style.cursor = '';
            this.showToast('Descrição de imagens desativada', 'info');
        }
    }

    async handleImageClick(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            e.stopPropagation();
            const imageUrl = e.target.src;
            if (imageUrl) await this.describeImage(imageUrl, e.target);
        }
    }

    async describeImage(imageUrl, imgElement) {
        this.showLoading('image-description', '🖼️ Analisando imagem com IA...');
        try {
            const response = await this.fetchWithRetry(`${this.getApiBaseUrl()}/describe-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl })
            });

            if (!response.ok) throw new Error('Falha na API');
            const data = await response.json();
            
            this.hideLoading('image-description');

            this.showModal('🖼️ Descrição Inteligente', `
                <div class="ai-result-container">
                    <div class="ai-result-header">
                        <div class="ai-result-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                        <div class="ai-result-meta">
                            <h3>Análise Visual</h3>
                            <span>IA Generativa</span>
                        </div>
                    </div>
                    <div class="ai-result-content">
                        <div class="ai-result-text">${data.description}</div>
                        <div class="ai-result-actions">
                            <button onclick="window.incluaAIWidget.copyDescription(this)" data-description="${data.description.replace(/"/g, '&quot;')}" class="btn btn-primary">Copiar</button>
                            <button onclick="window.incluaAIWidget.playDescription(this)" data-description="${data.description.replace(/"/g, '&quot;')}" class="btn btn-secondary">Ouvir</button>
                        </div>
                    </div>
                </div>
            `);
                this.showToast('✅ Imagem descrita com sucesso!', 'success');
                
                // Reproduz automaticamente a descrição em áudio
                setTimeout(() => {
                    console.log('Iniciando reprodução automática da descrição');
                    speechSynthesis.cancel(); // Garante que não há áudio anterior
                    
                    const utterance = new SpeechSynthesisUtterance(data.description);
                    utterance.lang = 'pt-BR';
                    utterance.rate = 1.0;
                    utterance.pitch = 1.0;
                    utterance.volume = 1.0;
                    
                    utterance.onstart = () => {
                        console.log('Áudio da descrição iniciado');
                        this.showToast('🔊 Reproduzindo descrição...', 'info');
                    };
                    
                    utterance.onend = () => {
                        this.currentSpeech = null;
                    };
                    
                    utterance.onerror = (e) => {
                        // Erro silencioso na reprodução de áudio
                    };
                    
                    this.currentSpeech = utterance;
                    speechSynthesis.speak(utterance);
                }, 800); // Delay maior para garantir que o modal esteja pronto
        } catch (error) {
            this.hideLoading('image-description');
            this.showToast('Erro ao descrever imagem', 'error');
        }
    }

    toggleTextSummarizer() {
        this.settings.textSummarizer = !this.settings.textSummarizer;
        if (this.settings.textSummarizer && (this.settings.textToImage || this.settings.librasRequest)) this.disableSelectionModes('summarize-text');

        // Se selecionar resumo normal, desabilita resumo didático
        if (this.settings.textSummarizer && this.settings.didacticSummary) {
            this.settings.didacticSummary = false;
            document.removeEventListener('mouseup', this.handleDidacticSummarization.bind(this));
            // Atualiza visual do botão didático se houver mudança cruzada
            const didacticBtn = document.querySelector('[data-action="didactic-summary"]');
            if (didacticBtn) this.updateButtonVisuals(didacticBtn);
        }

        if (this.settings.textSummarizer) {
            document.addEventListener('mouseup', this.boundHandleTextSummarization);
            this.showToast('Selecione texto para resumir', 'info');
        } else {
            document.removeEventListener('mouseup', this.boundHandleTextSummarization);
            this.showToast('Resumo de texto desativado', 'info');
        }
    }

    // Devolve o texto selecionado só se for uma seleção NOVA (ignora cliques dentro do widget/janelas
    // e o mesmo texto que já foi processado)
    takeSelection(event, minLength) {
        if (this.librasSelecting) return null;
        const target = event && event.target;
        if (target && target.closest && target.closest('#inclua-ai-widget, .modal-overlay, #chatbot-modal')) return null;
        const text = window.getSelection().toString().trim();
        if (text.length < minLength) return null;
        if (text === this.lastSelectionHandled) return null;
        this.lastSelectionHandled = text;
        return text;
    }

    async handleTextSummarization(event) {
        const text = this.takeSelection(event, 50);
        if (text) {
            this.showLoading('text-summary', '📝 Gerando resumo inteligente...');
            try {
                const response = await this.fetchWithRetry(`${this.getApiBaseUrl()}/summarize-text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ textToSummarize: text })
                });

                if (!response.ok) throw new Error('Falha na API');
                const data = await response.json();
                
                this.hideLoading('text-summary');

                this.showModal('📄 Resumo Inteligente', `
                    <div class="ai-result-container">
                        <div class="ai-result-header">
                            <div class="ai-result-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
                            </div>
                            <div class="ai-result-meta">
                                <h3>Resumo Gerado</h3>
                                <span>${text.length} caracteres → Resumo</span>
                            </div>
                        </div>
                        <div class="ai-result-content">
                            <div class="ai-result-text">${data.summarizedText}</div>
                            <div class="ai-result-actions">
                                <button onclick="window.incluaAIWidget.copySummary(this)" data-summary="${data.summarizedText.replace(/"/g, '&quot;')}" class="btn btn-primary">Copiar</button>
                                <button onclick="window.incluaAIWidget.playSummary(this)" data-summary="${data.summarizedText.replace(/"/g, '&quot;')}" class="btn btn-secondary">Ouvir</button>
                            </div>
                        </div>
                    </div>
                `);
                this.showToast('✅ Resumo gerado com sucesso!', 'success');
            } catch (error) {
                this.hideLoading('text-summary');
                this.showToast('Erro ao resumir texto', 'error');
            }
        }
    }

    toggleDidacticSummary() {
        this.settings.didacticSummary = !this.settings.didacticSummary;
        if (this.settings.didacticSummary && (this.settings.textToImage || this.settings.librasRequest)) this.disableSelectionModes('didactic-summary');

        // Se ativar resumo didático, desativar resumo normal
        if (this.settings.didacticSummary && this.settings.textSummarizer) {
            this.settings.textSummarizer = false;
            document.removeEventListener('mouseup', this.boundHandleTextSummarization);
            // Atualiza visual do botão resumir se houver mudança cruzada
            const summarizeBtn = document.querySelector('[data-action="summarize-text"]');
            if (summarizeBtn) this.updateButtonVisuals(summarizeBtn);
        }

        if (this.settings.didacticSummary) {
            // Usa boundHandle paraDidactic se ainda não existir, cria agora ou usa método direto se preferir
            if (!this.boundHandleDidacticSummarization) {
                this.boundHandleDidacticSummarization = this.handleDidacticSummarization.bind(this);
            }
            document.addEventListener('mouseup', this.boundHandleDidacticSummarization);
            this.showToast('Selecione texto para resumo didático', 'info');
        } else {
            if (this.boundHandleDidacticSummarization) {
                document.removeEventListener('mouseup', this.boundHandleDidacticSummarization);
            }
            this.showToast('Resumo didático desativado', 'info');
        }
    }

    async handleDidacticSummarization(event) {
        // Não gerar resumo se um modal estiver aberto
        if (this.activeModal) {
            return;
        }

        const text = this.takeSelection(event, 50);
        if (text && this.settings.didacticSummary) {
            this.showLoading('didactic-summary', '📚 Criando resumo didático...');
            try {
                const response = await this.fetchWithRetry(`${this.getApiBaseUrl()}/didactic-summarize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ textToSummarize: text, style: this.settings.didacticStyle || 'topicos' })
                });

                if (!response.ok) throw new Error('Falha na API');
                const data = await response.json();
                
                this.hideLoading('didactic-summary');

                this.showModal('📚 Resumo Didático', `
                    <div class="ai-result-container">
                        <div class="ai-result-header">
                            <div class="ai-result-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                            </div>
                            <div class="ai-result-meta">
                                <h3>Resumo Educacional</h3>
                                <span>${text.length} caracteres → ${this.escapeHtml(data.styleName || 'Formato Didático')}</span>
                            </div>
                        </div>
                        <div class="ai-result-content">
                            <div class="ai-result-text" style="white-space: pre-line;">${this.escapeHtml(data.didacticSummary)}</div>
                            <div class="ai-result-actions">
                                <button onclick="window.incluaAIWidget.copyDidacticSummary(this)" data-didactic="${this.escapeHtml(data.didacticSummary)}" class="btn btn-primary">Copiar</button>
                                <button onclick="window.incluaAIWidget.playDidacticSummary(this)" data-didactic="${this.escapeHtml(data.didacticSummary)}" class="btn btn-secondary">Ouvir</button>
                            </div>
                        </div>
                    </div>
                `);
                this.showToast('✅ Resumo didático criado!', 'success');
            } catch (error) {
                this.hideLoading('didactic-summary');
                this.showToast('Erro ao gerar resumo didático', 'error');
            }
        }
    }

    // ==========================================================================
    // VOICE COMMANDS - Controle por Voz
    // ==========================================================================

    toggleVoiceCommands() {
        this.settings.voiceCommands = !this.settings.voiceCommands;

        // Atualiza visual
        const btn = document.querySelector('[data-action="voice-commands"]');
        if (btn) this.updateButtonVisuals(btn);

        if (this.settings.voiceCommands) {
            this.initVoiceRecognition();
        } else {
            this.stopVoiceRecognition();
        }
    }

    initVoiceRecognition() {
        // Verifica suporte
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            this.showToast('❌ Seu navegador não suporta reconhecimento de voz', 'error');
            this.settings.voiceCommands = false;
            return;
        }

        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = false;
        this.speechRecognition.lang = 'pt-BR';

        this.speechRecognition.onstart = () => {
            this.isListening = true;
            this.showToast('🎙️ Ouvindo comandos... Diga "ajuda" para ver opções', 'success');
            this.showVoiceIndicator(true);
        };

        this.speechRecognition.onresult = (event) => {
            const last = event.results.length - 1;
            const command = event.results[last][0].transcript.toLowerCase().trim();
            this.processVoiceCommand(command);
        };

        this.speechRecognition.onerror = (event) => {
            if (event.error === 'no-speech') {
                // Silêncio, não é erro crítico
                return;
            }
            console.error('Erro de reconhecimento:', event.error);
            this.showToast(`Erro de voz: ${event.error}`, 'error');
        };

        this.speechRecognition.onend = () => {
            // Reinicia se ainda estiver ativo
            if (this.settings.voiceCommands && this.isListening) {
                try {
                    this.speechRecognition.start();
                } catch (e) {
                    // Ignora erro de já estar rodando
                }
            }
        };

        try {
            this.speechRecognition.start();
        } catch (e) {
            this.showToast('Erro ao iniciar reconhecimento de voz', 'error');
        }
    }

    stopVoiceRecognition() {
        this.isListening = false;
        this.showVoiceIndicator(false);

        if (this.speechRecognition) {
            try {
                this.speechRecognition.stop();
            } catch (e) {
                // Ignora
            }
        }
        this.showToast('🎙️ Controle por voz desativado', 'info');
    }

    processVoiceCommand(command) {
        // Feedback visual imediato
        this.showToast(`🗣️ "${command}"`, 'info');

        // Mapear comandos com mais variações
        const commands = {
            // Fonte - múltiplas formas de dizer
            'aumentar fonte': () => this.execVoice('font-increase', 'Fonte aumentada'),
            'aumentar': () => this.execVoice('font-increase', 'Fonte aumentada'),
            'fonte maior': () => this.execVoice('font-increase', 'Fonte aumentada'),
            'maior': () => this.execVoice('font-increase', 'Fonte maior'),
            'grande': () => this.execVoice('font-increase', 'Texto maior'),

            'diminuir fonte': () => this.execVoice('font-decrease', 'Fonte diminuída'),
            'diminuir': () => this.execVoice('font-decrease', 'Fonte diminuída'),
            'fonte menor': () => this.execVoice('font-decrease', 'Fonte diminuída'),
            'menor': () => this.execVoice('font-decrease', 'Fonte menor'),
            'pequeno': () => this.execVoice('font-decrease', 'Texto menor'),

            // Leitura
            'ler texto': () => this.execVoice('text-reader', 'Leitor ativado'),
            'ler': () => this.execVoice('text-reader', 'Leitor ativado'),
            'leitor': () => this.execVoice('text-reader', 'Leitor de texto'),
            'leia': () => this.execVoice('text-reader', 'Leitor ativado'),
            'parar leitura': () => { speechSynthesis.cancel(); this.showToast('⏹️ Leitura parada', 'success'); },
            'parar': () => { speechSynthesis.cancel(); this.showToast('⏹️ Parado', 'success'); },
            'silêncio': () => { speechSynthesis.cancel(); this.showToast('🤫 Silenciado', 'success'); },
            'calar': () => { speechSynthesis.cancel(); this.showToast('🤫 OK', 'success'); },

            // Hover
            'passar mouse': () => this.execVoice('hover-reader', 'Leitura ao passar ativada'),
            'hover': () => this.execVoice('hover-reader', 'Hover reader'),

            // Foco
            'foco sem imagens': () => this.execVoice('focus-mode', 'Foco sem imagens'),
            'foco com imagens': () => this.execVoice('focus-mode-images', 'Foco com imagens'),
            'modo foco': () => this.execVoice('focus-mode-plain', 'Foco'),
            'foco': () => this.execVoice('focus-mode-plain', 'Foco'),
            'concentrar': () => this.execVoice('focus-mode', 'Concentração ativada'),
            'concentração': () => this.execVoice('focus-mode', 'Modo concentração'),

            // Links
            'destacar links': () => this.execVoice('highlight-links', 'Links destacados'),
            'mostrar links': () => this.execVoice('highlight-links', 'Links visíveis'),
            'links': () => this.execVoice('highlight-links', 'Links'),

            // Imagem
            'descrever imagem': () => this.execVoice('describe-image', 'Clique em uma imagem'),
            'descrever foto': () => this.execVoice('describe-image', 'Modo descrição de imagem'),
            'imagem': () => this.execVoice('describe-image', 'Descrição de imagem'),
            'foto': () => this.execVoice('describe-image', 'Modo foto'),

            // Resumir
            'resumir': () => this.execVoice('summarize-text', 'Selecione texto para resumir'),
            'resumo': () => this.execVoice('summarize-text', 'Modo resumo'),
            'resumir texto': () => this.execVoice('summarize-text', 'Resumidor ativado'),
            'didático': () => this.execVoice('didactic-summary', 'Resumo didático'),
            'gerar imagem': () => this.execVoice('text-to-image', 'Selecione um texto para gerar a imagem'),
            'criar imagem': () => this.execVoice('text-to-image', 'Selecione um texto para gerar a imagem'),
            'imagem do texto': () => this.execVoice('text-to-image', 'Selecione um texto para gerar a imagem'),
            'assistente': () => this.execVoice('chatbot', 'Assistente aberto'),
            'pedir libras': () => this.execVoice('libras-request', 'Selecione um texto para pedir em Libras'),
            'libras por pedido': () => this.execVoice('libras-request', 'Selecione um texto para pedir em Libras'),
            'meus pedidos': () => this.execVoice('libras-my-requests', 'Meus pedidos de Libras'),
            'conversar': () => this.execVoice('chatbot', 'Assistente aberto'),
            'abrir chat': () => this.execVoice('chatbot', 'Assistente aberto'),

            // Libras
            'libras': () => this.execVoice('libras-hover', 'Libras ativado'),
            'traduzir': () => this.execVoice('libras-hover', 'Tradução Libras'),
            'língua de sinais': () => this.execVoice('libras-hover', 'Libras'),

            // Ajuda
            'ajuda': () => this.showVoiceHelpModal(),
            'comandos': () => this.showVoiceHelpModal(),
            'o que posso falar': () => this.showVoiceHelpModal(),
            'help': () => this.showVoiceHelpModal(),

            // Menu
            'fechar menu': () => { if (this.isActive) this.togglePanel(); this.showToast('Menu fechado', 'success'); },
            'fechar': () => { if (this.isActive) this.togglePanel(); },
            'abrir menu': () => { if (!this.isActive) this.togglePanel(); this.showToast('Menu aberto', 'success'); },
            'abrir': () => { if (!this.isActive) this.togglePanel(); },
            'menu': () => { this.togglePanel(); },

            // Resetar
            'resetar': () => { this.resetSettings(); this.showToast('⚙️ Configurações resetadas', 'success'); },
            'limpar': () => { this.resetSettings(); },
            'reiniciar': () => { this.resetSettings(); },

            // Desativar voz
            'desativar voz': () => { this.toggleVoiceCommands(); },
            'parar de ouvir': () => { this.toggleVoiceCommands(); }
        };

        // Procura correspondência (ordem importa - mais específicos primeiro)
        let matched = false;
        const sortedCommands = Object.entries(commands).sort((a, b) => b[0].length - a[0].length);

        for (const [key, action] of sortedCommands) {
            if (command.includes(key)) {
                action();
                matched = true;
                break;
            }
        }

        if (!matched) {
            this.showToast('❓ Não entendi. Diga "ajuda" para ver comandos', 'info');
        }
    }

    execVoice(action, feedback) {
        const button = document.querySelector(`[data-action="${action}"]`);
        if (button) {
            this.handleAction(action, button);
            this.showToast(`✅ ${feedback}`, 'success');
        }
    }

    showVoiceHelpModal() {
        this.showModal('🎙️ Comandos de Voz', `
            <div style="text-align: left; line-height: 1.8;">
                <p><strong>📏 Fonte:</strong> "maior", "menor", "aumentar", "diminuir"</p>
                <p><strong>🔊 Leitura:</strong> "ler", "parar", "silêncio"</p>
                <p><strong>🎯 Foco:</strong> "foco", "concentrar"</p>
                <p><strong>🖼️ Imagem:</strong> "descrever imagem", "foto"</p>
                <p><strong>📝 Resumo:</strong> "resumir", "didático"</p>
                <p><strong>🔗 Links:</strong> "destacar links"</p>
                <p><strong>🤟 Libras:</strong> "libras", "traduzir"</p>
                <p><strong>📋 Menu:</strong> "abrir", "fechar"</p>
                <p><strong>⚙️ Sistema:</strong> "resetar", "desativar voz"</p>
            </div>
        `);
    }

    showVoiceIndicator(show) {
        let indicator = document.getElementById('inclua-voice-indicator');

        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'inclua-voice-indicator';
                indicator.innerHTML = `
                    <div class="voice-pulse"></div>
                    <span>🎙️ Ouvindo...</span>
                `;
                document.body.appendChild(indicator);
            }
            indicator.style.display = 'flex';
        } else {
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    }

    // ==========================================================================
    // FOCUS MODE - Modo de Concentração
    // ==========================================================================

    toggleFocusMode(mode) {
        const modes = {
            'plain': { key: 'focusModePlain', action: 'focus-mode-plain', label: 'Foco ativado' },
            'no-images': { key: 'focusMode', action: 'focus-mode', label: 'Foco sem imagens ativado' },
            'images': { key: 'focusModeImages', action: 'focus-mode-images', label: 'Foco com imagens ativado' }
        };
        const current = modes[mode];
        const isActive = !this.settings[current.key];

        // Apenas um modo de foco pode ficar ativo por vez
        Object.values(modes).forEach(m => {
            this.settings[m.key] = false;
            const btn = document.querySelector(`[data-action="${m.action}"]`);
            if (btn) this.updateButtonVisuals(btn);
        });
        this.disableFocusMode();

        if (isActive) {
            this.settings[current.key] = true;
            const btn = document.querySelector(`[data-action="${current.action}"]`);
            if (btn) this.updateButtonVisuals(btn);
            this.enableFocusMode(mode);
            this.showToast(`🎯 ${current.label} — Passe o mouse para iluminar`, 'success');
        } else {
            this.showToast('Modo Foco desativado', 'info');
        }
        this.saveSettings();
    }

    enableFocusMode(mode = 'plain') {
        // Cria overlay escuro
        if (!document.getElementById('inclua-focus-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'inclua-focus-overlay';
            document.body.appendChild(overlay);
        }

        // Bind do handler
        if (!this.boundFocusHandler) {
            this.boundFocusHandler = this.handleFocusHover.bind(this);
        }

        this.focusIncludesImages = mode === 'images';
        document.addEventListener('mousemove', this.boundFocusHandler);
        document.body.classList.add('inclua-focus-active');
        document.body.classList.toggle('inclua-focus-no-images', mode === 'no-images');
    }

    disableFocusMode() {
        const overlay = document.getElementById('inclua-focus-overlay');
        if (overlay) overlay.remove();

        if (this.boundFocusHandler) {
            document.removeEventListener('mousemove', this.boundFocusHandler);
        }

        // Remove highlight de qualquer elemento
        const highlighted = document.querySelector('.focus-highlighted');
        if (highlighted) {
            highlighted.classList.remove('focus-highlighted');
        }

        this.focusIncludesImages = false;
        document.body.classList.remove('inclua-focus-active');
        document.body.classList.remove('inclua-focus-no-images');
    }

    handleFocusHover(e) {
        if (!document.body.classList.contains('inclua-focus-active')) return;
        if (e.target.closest('#inclua-ai-widget')) return;
        if (e.target.id === 'inclua-focus-overlay') return;

        // Encontra elemento de conteúdo mais próximo
        const contentTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'BLOCKQUOTE', 'DIV', 'ARTICLE', 'SECTION'];
        let target = null;

        if (this.focusIncludesImages) {
            // Foco com imagens: só imagens são destacadas (figura > picture > img/vídeo)
            target = e.target.closest('figure, picture, img, video');
            if (!target) {
                document.querySelectorAll('.focus-highlighted').forEach(el => el.classList.remove('focus-highlighted'));
                return;
            }
        }

        if (!target) {
            target = e.target;
            // Sobe na árvore até encontrar um elemento de conteúdo significativo
            while (target && !contentTags.includes(target.tagName)) {
                target = target.parentElement;
            }
        }

        if (!target || target === document.body || target === document.documentElement) return;

        // Remove highlight anterior apenas se o alvo mudou (evita piscar)
        document.querySelectorAll('.focus-highlighted').forEach(el => {
            if (el !== target) el.classList.remove('focus-highlighted');
        });
        target.classList.add('focus-highlighted');
    }

    // ==========================================================================
    // LIBRAS ACCESSIBILITY FUNCTIONS
    // ==========================================================================

    toggleLibrasHover() {
        this.settings.librasHover = !this.settings.librasHover;

        if (this.settings.librasHover) {
            // Fecha o painel para ele não cobrir o avatar
            if (this.isActive) this.togglePanel();
            document.addEventListener('mouseover', this.boundHandleLibrasHover);
            document.addEventListener('mouseout', this.boundHandleLibrasHoverOut);
            this.showToast('🤟 Carregando o avatar de Libras...', 'info');
            this.ensureVLibras()
                .then(() => { if (this.settings.librasHover) this.showToast('🤟 Passe o mouse sobre um texto e o avatar traduz em Libras', 'success'); })
                .catch(() => this.showToast('Não foi possível carregar o avatar de Libras. O site pode estar bloqueando.', 'error'));
        } else {
            document.removeEventListener('mouseover', this.boundHandleLibrasHover);
            document.removeEventListener('mouseout', this.boundHandleLibrasHoverOut);
            clearTimeout(this.librasHoverTimeout);
            this.removeLibrasHighlight();
            this.hideVLibras();
            this.showToast('Libras ao hover desativado', 'info');
        }
    }

    initLibrasPlayer() {
        // Cria o player flutuante de Libras se não existir
        if (document.getElementById('inclua-libras-player')) return;

        const playerHTML = `
            <div id="inclua-libras-player" class="libras-player-container" style="display: none;">
                <div class="libras-player-header">
                    <span class="libras-player-title">🤟 Tradução em Libras</span>
                    <button class="libras-player-close" onclick="window.incluaAIWidget.hideLibrasPlayer()" aria-label="Fechar">✕</button>
                </div>
                <div class="libras-player-content">
                    <div class="libras-original-text" id="libras-original-text"></div>
                    <div class="libras-glosa-container">
                        <div class="libras-glosa-label">📝 Glosa em Libras:</div>
                        <div class="libras-glosa-text" id="libras-glosa-text"></div>
                    </div>
                    <div class="libras-hugo-container" id="libras-hugo-container">
                        <img src="hugo-avatar.png" 
                             alt="Avatar Hugo fazendo sinais de Libras" 
                             class="hugo-avatar-image"
                             id="hugo-avatar-img">
                        <div class="hugo-status" id="hugo-status">Avatar demonstrativo - Mostra como funcionaria</div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', playerHTML);
        this.injectLibrasStyles();
    }

    // Funções VLibras removidas - usando apenas imagem demonstrativa

    oldInitEmbeddedVLibras() {
        // Carrega o VLibras de forma embutida no nosso player
        if (this.vlibrasLoaded) {
            this.moveVLibrasToPlayer();
            return;
        }

        // Verifica se já existe o VLibras na página
        if (document.querySelector('[vw]')) {
            this.vlibrasLoaded = true;
            this.moveVLibrasToPlayer();
            return;
        }

        // Cria o container do VLibras
        const vlibrasDiv = document.createElement('div');
        vlibrasDiv.setAttribute('vw', '');
        vlibrasDiv.className = 'enabled';
        vlibrasDiv.id = 'vlibras-widget-container';
        vlibrasDiv.innerHTML = `
            <div vw-access-button class="active"></div>
            <div vw-plugin-wrapper>
                <div class="vw-plugin-top-wrapper"></div>
            </div>
        `;
        document.body.appendChild(vlibrasDiv);

        // Carrega o script do VLibras
        const script = document.createElement('script');
        script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
        script.onload = () => {
            if (window.VLibras) {
                new window.VLibras.Widget('https://vlibras.gov.br/app');
                this.vlibrasLoaded = true;
                console.log('✅ VLibras Widget carregado');

                // Aguarda o widget renderizar e move para nosso player
                setTimeout(() => {
                    this.moveVLibrasToPlayer();
                }, 1500);
            }
        };
        script.onerror = () => {
            console.error('❌ Erro ao carregar VLibras');
            this.showHugoFallback();
        };
        document.head.appendChild(script);
    }

    moveVLibrasToPlayer() {
        const hugoContainer = document.getElementById('hugo-avatar-wrapper');
        const vlibrasWrapper = document.querySelector('[vw-plugin-wrapper]');
        const vlibrasButton = document.querySelector('[vw-access-button]');

        if (hugoContainer && vlibrasWrapper) {
            // Estiliza o wrapper do VLibras para caber no nosso player
            this.injectVLibrasOverrideStyles();

            // Atualiza status
            hugoContainer.innerHTML = `
                <div class="hugo-ready">
                    <div class="hugo-icon">🧏</div>
                    <span>Clique abaixo para ver o Hugo traduzindo!</span>
                    <small style="color: #64748b; font-size: 11px; margin-top: 8px; display: block;">O Hugo aparecerá no widget do VLibras (governo)</small>
                </div>
            `;

            console.log('✅ VLibras pronto para uso');
        }

        // Mantém o botão de acesso visível mas discreto
        if (vlibrasButton) {
            vlibrasButton.style.cssText = 'position: fixed !important; bottom: 20px !important; right: 20px !important; z-index: 9999 !important;';
        }
    }

    showHugoFallback() {
        const hugoContainer = document.getElementById('hugo-avatar-wrapper');
        if (hugoContainer) {
            hugoContainer.innerHTML = `
                <div class="hugo-fallback">
                    <div class="hugo-icon">🤟</div>
                    <span>Use a glosa acima para traduzir em Libras</span>
                </div>
            `;
        }
    }

    injectVLibrasOverrideStyles() {
        if (document.getElementById('vlibras-override-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'vlibras-override-styles';
        styles.textContent = `
            /* Estiliza o VLibras para aparecer em tela cheia quando ativado */
            [vw].enabled [vw-plugin-wrapper] {
                position: fixed !important;
                bottom: 80px !important;
                right: 20px !important;
                z-index: 999999 !important;
            }
            
            /* Animação suave ao abrir */
            [vw].enabled [vw-plugin-wrapper].active {
                animation: vlibrasOpen 0.3s ease forwards;
            }
            
            @keyframes vlibrasOpen {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(styles);
    }

    initVLibrasPlayer() {
        // Alias para compatibilidade
        this.initEmbeddedVLibras();
    }

    loadVLibrasWidget() {
        // Mantido para compatibilidade
        this.initEmbeddedVLibras();
    }

    activateVLibras() {
        // Abre o widget do VLibras
        const accessButton = document.querySelector('[vw-access-button]');
        if (accessButton) {
            accessButton.click();
        }
    }

    playHugoTranslation() {
        // Usa glosa se disponível, senão usa texto original
        const textToTranslate = this.currentLibrasGlosa || this.currentOriginalText;

        if (!textToTranslate) {
            this.showToast('Nenhuma tradução disponível', 'error');
            return;
        }

        // Ativa o VLibras primeiro
        this.activateVLibras();
        this.showToast('🤟 Abrindo Hugo...', 'info');

        // Aguarda o VLibras abrir e então envia o texto
        setTimeout(() => {
            this.sendTextToVLibras(textToTranslate);
        }, 800);
    }

    sendTextToVLibras(text) {
        // Tenta encontrar o campo de texto do VLibras
        const vlibrasWrapper = document.querySelector('[vw-plugin-wrapper]');

        if (!vlibrasWrapper) {
            // VLibras não carregou ainda, mostra instrução simples
            this.showToast('🤟 Aguarde o VLibras carregar...', 'info');
            return;
        }

        // Busca o textarea do VLibras
        const textInputs = vlibrasWrapper.querySelectorAll('textarea, input[type="text"], .vw-text-input');
        let textArea = null;

        for (const input of textInputs) {
            if (input.offsetParent !== null) { // Visível
                textArea = input;
                break;
            }
        }

        if (textArea) {
            // Insere o texto
            textArea.value = text;
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
            textArea.dispatchEvent(new Event('change', { bubbles: true }));

            // Tenta clicar no botão de traduzir
            setTimeout(() => {
                const buttons = vlibrasWrapper.querySelectorAll('button');
                for (const btn of buttons) {
                    const btnText = btn.textContent?.toLowerCase() || '';
                    if (btnText.includes('traduzir') || btnText.includes('play') || btn.type === 'submit') {
                        btn.click();
                        this.showToast('🤟 Hugo está traduzindo!', 'success');
                        return;
                    }
                }
                // Se não encontrou botão específico, tenta o primeiro botão
                if (buttons.length > 0) {
                    buttons[0].click();
                    this.showToast('🤟 Hugo está traduzindo!', 'success');
                }
            }, 300);
        } else {
            // Aguarda mais um pouco e tenta novamente
            this.showToast('🤟 Insira o texto no campo do VLibras', 'info');
        }
    }

    translateWithVLibras(text) {
        // Método alternativo - salva o texto para uso posterior
        this.currentLibrasGlosa = text;
    }

    injectLibrasStyles() {
        if (document.getElementById('inclua-libras-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'inclua-libras-styles';
        styles.textContent = `
            .libras-player-container {
                position: fixed;
                bottom: 100px;
                right: 24px;
                width: 400px;
                background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                z-index: 999998;
                font-family: 'Inter', system-ui, sans-serif;
                overflow: hidden;
                animation: librasSlideIn 0.3s ease;
            }

            @keyframes librasSlideIn {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .libras-player-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 18px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }

            .libras-player-title { font-size: 15px; font-weight: 600; }

            .libras-player-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 26px;
                height: 26px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 13px;
                transition: background 0.2s;
            }

            .libras-player-close:hover { background: rgba(255, 255, 255, 0.35); }

            .libras-player-content { padding: 14px; }

            .libras-original-text {
                background: rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                padding: 10px 14px;
                margin-bottom: 12px;
                color: #e2e8f0;
                font-size: 13px;
                line-height: 1.5;
                max-height: 80px;
                overflow-y: auto;
            }

            .libras-original-text::before {
                content: "📄 Texto original: ";
                font-weight: 600;
                color: #94a3b8;
            }

            .libras-glosa-container {
                margin-bottom: 12px;
            }

            .libras-glosa-label {
                color: #64748b;
                font-size: 12px;
                margin-bottom: 6px;
                font-weight: 500;
            }

            .libras-glosa-text {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%);
                border: 2px solid rgba(16, 185, 129, 0.4);
                border-radius: 12px;
                padding: 16px;
                color: #34d399;
                font-size: 18px;
                font-weight: 700;
                text-align: center;
                letter-spacing: 2px;
                min-height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                word-break: break-word;
                text-transform: uppercase;
            }

            .libras-hugo-container {
                background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
            }

            .hugo-avatar-image {
                width: 200px;
                height: 200px;
                border-radius: 16px;
                object-fit: cover;
                box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
                border: 3px solid #10b981;
                animation: hugoPulse 3s ease-in-out infinite;
            }

            @keyframes hugoPulse {
                0%, 100% { transform: scale(1); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3); }
                50% { transform: scale(1.02); box-shadow: 0 12px 32px rgba(16, 185, 129, 0.5); }
            }

            .hugo-status {
                color: #94a3b8;
                font-size: 12px;
                font-style: italic;
                text-align: center;
            }

            .hugo-avatar-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 80px;
            }

            .hugo-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                color: #94a3b8;
            }

            .hugo-loading-avatar {
                font-size: 48px;
                animation: hugoPulseOld 2s ease-in-out infinite;
            }

            @keyframes hugoPulseOld {
                0%, 100% { transform: scale(1); opacity: 0.7; }
                50% { transform: scale(1.1); opacity: 1; }
            }

            .hugo-instruction {
                color: #64748b;
                font-size: 12px;
                line-height: 1.4;
            }

            .hugo-instruction strong {
                color: #10b981;
            }

            .hugo-ready, .hugo-fallback {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                color: #e2e8f0;
                padding: 10px;
            }

            .hugo-ready .hugo-icon {
                font-size: 48px;
                animation: hugoReady 1s ease;
            }

            .hugo-fallback .hugo-icon {
                font-size: 40px;
                opacity: 0.6;
            }

            @keyframes hugoReady {
                0% { transform: scale(0.5); opacity: 0; }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); opacity: 1; }
            }

            .hugo-ready span, .hugo-fallback span {
                font-size: 12px;
                color: #94a3b8;
                text-align: center;
            }

            .libras-player-actions {
                display: flex;
                gap: 10px;
                margin-top: 12px;
            }

            .libras-player-actions .btn {
                flex: 1;
                padding: 12px 16px;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }

            .libras-player-actions .btn-primary {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }

            .libras-player-actions .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
            }

            .libras-player-actions .btn-full {
                width: 100%;
            }

            .libras-player-actions .btn-secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #e2e8f0;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .libras-player-actions .btn-secondary:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            .libras-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                padding: 16px;
                color: #94a3b8;
            }

            .libras-loading-spinner {
                width: 36px;
                height: 36px;
                border: 3px solid rgba(16, 185, 129, 0.2);
                border-top-color: #10b981;
                border-radius: 50%;
                animation: librasSpin 1s linear infinite;
            }

            @keyframes librasSpin { to { transform: rotate(360deg); } }

            .inclua-libras-active {
                outline: 3px solid #10b981 !important;
                background-color: rgba(16, 185, 129, 0.12) !important;
                transition: all 0.2s ease !important;
                border-radius: 4px;
            }

            /* Esconder o botão azul do VLibras quando nosso player estiver ativo */
            .libras-player-container[style*="block"] ~ [vw] [vw-access-button] {
                opacity: 0.3;
            }
        `;
        document.head.appendChild(styles);
    }

    async handleLibrasHover(e) {
        if (this.activeModal || e.target.closest('#inclua-ai-widget') || e.target.closest('#vlibras-app-root, #vlibras-access-wrapper, [vw]')) return;

        const inlineTags = ['A', 'B', 'STRONG', 'I', 'EM', 'SPAN', 'LABEL', 'BUTTON'];
        let target = e.target;

        if (inlineTags.includes(target.tagName)) {
            target = target.parentElement || target;
        }

        const text = target.innerText ? target.innerText.trim() : '';

        if (text.length >= 5 && text.length < 500) {
            if (this.currentLibrasTarget === target) return;

            clearTimeout(this.librasHoverTimeout);
            this.librasHoverTimeout = setTimeout(async () => {
                this.highlightLibrasElement(target);
                this.currentLibrasTarget = target;
                await this.signWithVLibras(target);
            }, 800);
        }
    }

    handleLibrasHoverOut(e) {
        if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('#inclua-libras-player')) return;
        clearTimeout(this.librasHoverTimeout);
    }

    highlightLibrasElement(el) {
        this.removeLibrasHighlight();
        this.currentLibrasHighlighted = el;
        el.classList.add('inclua-libras-active');
    }

    removeLibrasHighlight() {
        if (this.currentLibrasHighlighted) {
            this.currentLibrasHighlighted.classList.remove('inclua-libras-active');
            this.currentLibrasHighlighted = null;
        }
        this.currentLibrasTarget = null;
    }

    showLibrasLoading(originalText) {
        const player = document.getElementById('inclua-libras-player');
        if (!player) return;

        player.style.display = 'block';

        const originalEl = document.getElementById('libras-original-text');
        const glosaEl = document.getElementById('libras-glosa-text');

        if (originalEl) originalEl.textContent = originalText;
        if (glosaEl) {
            glosaEl.innerHTML = `
                <div class="libras-loading">
                    <div class="libras-loading-spinner"></div>
                    <span>Convertendo...</span>
                </div>
            `;
        }
    }

    displayLibrasResult(originalText, glosa) {
        const player = document.getElementById('inclua-libras-player');
        if (!player) return;

        player.style.display = 'block';
        this.currentLibrasGlosa = glosa;

        const originalEl = document.getElementById('libras-original-text');
        const glosaEl = document.getElementById('libras-glosa-text');
        const hugoContainer = document.getElementById('hugo-avatar-wrapper');

        if (originalEl) originalEl.textContent = originalText;
        if (glosaEl) glosaEl.textContent = glosa;

        // Atualiza container do Hugo com instruções
        if (hugoContainer) {
            hugoContainer.innerHTML = `
                <div class="hugo-loading-avatar">🧏</div>
                <div class="hugo-instruction">
                    Clique em <strong>"Ver em Libras"</strong> para ver o Hugo traduzindo!
                </div>
            `;
        }
    }

    hideLibrasPlayer() {
        const player = document.getElementById('inclua-libras-player');
        if (player) player.style.display = 'none';
        this.removeLibrasHighlight();
    }

    copyLibrasText() {
        if (this.currentLibrasGlosa) {
            navigator.clipboard.writeText(this.currentLibrasGlosa)
                .then(() => this.showToast('Glosa copiada! Cole no VLibras acima.', 'success'))
                .catch(() => this.showToast('Erro ao copiar', 'error'));
        }
    }

    // ==========================================================================
    // MODAL SYSTEM
    // ==========================================================================

    showModal(title, content, isHtml = true) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay show';
        overlay.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div class="modal-header">
                    <h3 class="modal-title" id="modal-title">${title}</h3>
                    <button class="modal-close" aria-label="Fechar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-content">
                    ${isHtml ? content : `<p>${content}</p>`}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.activeModal = overlay;

        // Fechar modal
        const closeBtn = overlay.querySelector('.modal-close');
        const close = () => {
            speechSynthesis.cancel();
            if (this.currentSpeech) this.currentSpeech = null;

            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
            this.activeModal = null;
        };

        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        // Trap focus no modal
        this.trapFocus(overlay.querySelector('.modal'));
    }

    // ==========================================================================
    // ACTIONS HELPERS (Copy, Play, etc)
    // ==========================================================================

    copyDescription(btn) {
        const text = btn.dataset.description;
        navigator.clipboard.writeText(text).then(() => this.showToast('Copiado!', 'success'));
    }

    playDescription(btn) {
        const text = btn.dataset.description;
        this.speak(text);
    }

    copySummary(btn) {
        const text = btn.dataset.summary;
        navigator.clipboard.writeText(text).then(() => this.showToast('Copiado!', 'success'));
    }

    playSummary(btn) {
        const text = btn.dataset.summary;
        this.speak(text);
    }

    copyDidacticSummary(btn) {
        const text = btn.dataset.didactic;
        navigator.clipboard.writeText(text).then(() => this.showToast('Copiado!', 'success'));
    }

    playDidacticSummary(btn) {
        const text = btn.dataset.didactic;
        this.speak(text);
    }

    speak(text) {
        if (this.currentSpeech) {
            speechSynthesis.cancel();
            this.currentSpeech = null;
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.onend = () => { this.currentSpeech = null; };
        this.currentSpeech = utterance;
        speechSynthesis.speak(utterance);
    }

    // ==========================================================================
    // SETTINGS MANAGEMENT
    // ==========================================================================

    loadSettings() {
        const saved = localStorage.getItem('inclua-ai-settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            this.applySettings();
        }
    }

    saveSettings() {
        localStorage.setItem('inclua-ai-settings', JSON.stringify(this.settings));
        // Avisa a extensão (se existir) para guardar as preferências e valer em todos os sites
        try { window.postMessage({ source: 'inclua-ai-widget', type: 'settings', settings: this.settings }, '*'); } catch (e) {}
    }

    applySettings() {
        if (this.settings.fontSize !== 0) {
            this.applyFontSize();
        }

        if (this.settings.colorFilter !== 'none') {
            this.applyColorblindFilter(this.settings.colorFilter);
        }

        if (this.settings.highlightLinksColor) {
            document.body.style.setProperty('--inclua-link-highlight-color', this.settings.highlightLinksColor);
            document.body.style.setProperty('--inclua-link-highlight-shadow', this.settings.highlightLinksColor + 'cc');
        }

        if (this.settings.highlightLinks) {
            document.body.classList.add('inclua-highlight-links');
        }
    }

    applyColorblindFilter(type) {
        this.settings.colorFilter = type;
        document.documentElement.className = document.documentElement.className.replace(/filter-\w+/g, '');
        if (type !== 'none') {
            document.documentElement.classList.add(`filter-${type}`);
        }
        this.saveSettings();
    }

    injectSVGFilters() {
        const filters = `
            <svg style="display: none">
                <defs>
                    <filter id="protanopia"><feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0 0.558, 0.442, 0, 0, 0 0, 0.242, 0.758, 0, 0 0, 0, 0, 1, 0"/></filter>
                    <filter id="deuteranopia"><feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0 0.7, 0.3, 0, 0, 0 0, 0.3, 0.7, 0, 0 0, 0, 0, 1, 0"/></filter>
                    <filter id="tritanopia"><feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0 0, 0.433, 0.567, 0, 0 0, 0.475, 0.525, 0, 0 0, 0, 0, 1, 0"/></filter>
                    <filter id="achromatopsia"><feColorMatrix type="matrix" values="0.299, 0.587, 0.114, 0, 0 0.299, 0.587, 0.114, 0, 0 0.299, 0.587, 0.114, 0, 0 0, 0, 0, 1, 0"/></filter>
                </defs>
            </svg>
            <style>
                .filter-protanopia { filter: url(#protanopia); }
                .filter-deuteranopia { filter: url(#deuteranopia); }
                .filter-tritanopia { filter: url(#tritanopia); }
                .filter-achromatopsia { filter: url(#achromatopsia); }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', filters);
    }

    setupVoices() {
        // Carrega vozes disponíveis
        speechSynthesis.onvoiceschanged = () => {
            const voices = speechSynthesis.getVoices();
            // Lógica de seleção de voz pode ser expandida aqui
        };
    }

    injectCategoryStyles() {
        // Tenta remover estilo antigo se existir para limpar cache
        const oldStyle = document.getElementById('inclua-category-styles');
        if (oldStyle) oldStyle.remove();

        if (document.getElementById('inclua-category-styles-v2')) return;

        const styles = document.createElement('style');
        styles.id = 'inclua-category-styles-v2';
        styles.textContent = `
            /* Layout do Painel Melhorado */
            .panel-content {
                padding: 16px !important;
                overflow-y: auto;
                max-height: 70vh;
            }

            /* Categorias de Acessibilidade */
            .acess-category {
                margin-bottom: 48px;
                padding-bottom: 20px;
                animation: categoryFadeIn 0.4s ease forwards;
            }

            @keyframes categoryFadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .category-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--category-color);
            }

            .category-icon {
                font-size: 24px;
            }

            .category-title {
                font-size: 15px;
                font-weight: 700;
                color: var(--category-color);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* Grid de Cards */
            .category-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
                gap: 20px;
                padding: 8px;
                margin-top: 4px;
            }

            /* Cards de Funcionalidade - CORES SÓLIDAS & INDICADORES */
            .feature-card {
                background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%) !important;
                border: 2px solid #4a5568 !important;
                border-radius: 14px;
                padding: 18px 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                min-height: 120px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1);
                color: #cbd5e0 !important;
                opacity: 1 !important;
                visibility: visible !important;
            }

            /* Cores específicas por categoria */
            [data-category="visual"] .feature-card {
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important;
                border: 2px solid #3b82f6 !important;
                color: #ffffff !important;
            }

            [data-category="auditiva"] .feature-card {
                background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
                border: 2px solid #10b981 !important;
                color: #ffffff !important;
            }

            [data-category="cognitiva"] .feature-card {
                background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
                border: 2px solid #8b5cf6 !important;
                color: #ffffff !important;
            }

            .feature-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 12px 32px rgba(0,0,0,0.15);
                filter: brightness(1.15);
            }

            [data-category="visual"] .feature-card:hover {
                box-shadow: 0 8px 24px rgba(37, 99, 235, 0.5), 0 12px 32px rgba(59, 130, 246, 0.3);
                border-color: #60a5fa !important;
            }

            [data-category="auditiva"] .feature-card:hover {
                box-shadow: 0 8px 24px rgba(5, 150, 105, 0.5), 0 12px 32px rgba(16, 185, 129, 0.3);
                border-color: #34d399 !important;
            }

            [data-category="cognitiva"] .feature-card:hover {
                box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5), 0 12px 32px rgba(139, 92, 246, 0.3);
                border-color: #a78bfa !important;
            }

            /* ESTADO ATIVO - CLARAMENTE LIGADO */
            .feature-card.active {
                background: linear-gradient(145deg, var(--category-color) 0%, color-mix(in srgb, var(--category-color) 80%, black) 100%) !important;
                border-color: rgba(255, 255, 255, 0.5) !important;
                color: white !important;
                box-shadow: 0 0 20px var(--category-color), 0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3) !important;
            }

            .feature-card.active .card-icon {
                transform: scale(1.1);
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            }

            .feature-card.active .card-status {
                background: white;
                color: var(--category-color);
                opacity: 1;
                transform: translateY(0);
            }

            /* Indicador ON/OFF */
            .card-status {
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                background: #475569;
                color: #94a3b8;
                padding: 2px 8px;
                border-radius: 10px;
                margin-top: 4px;
                transition: all 0.2s;
                opacity: 0.8;
            }

            .feature-card:hover .card-status {
                background: #64748b;
                color: white;
            }

            /* Checkmark flutuante */
            .active-check {
                position: absolute;
                top: -8px;
                right: -8px;
                background: white;
                color: var(--category-color);
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: bold;
                border: 2px solid var(--category-color);
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                opacity: 0;
                transform: scale(0);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            .feature-card.active .active-check {
                opacity: 1;
                transform: scale(1);
            }

            .card-icon {
                font-size: 38px;
                margin-bottom: 4px;
                display: flex !important;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4));
                opacity: 0.95;
            }

            .card-icon svg {
                width: 32px;
                height: 32px;
                stroke-width: 2.5;
            }

            .feature-card:hover .card-icon {
                transform: scale(1.1);
                filter: drop-shadow(0 4px 12px rgba(255,255,255,0.3));
                opacity: 1;
            }

            .feature-card.active .card-icon {
                filter: drop-shadow(0 4px 12px rgba(255,255,255,0.5));
            }

            .card-label {
                font-size: 11.5px;
                font-weight: 600;
                color: inherit;
                text-align: center;
                line-height: 1.3;
                display: block !important;
            }

            .card-shortcut {
                font-size: 10px;
                color: #ffffff;
                background: var(--category-color, #a78bfa);
                padding: 2px 7px;
                border-radius: 10px;
                font-family: 'Courier New', monospace;
                font-weight: 800;
                position: absolute;
                top: 4px;
                right: 4px;
                line-height: 1.5;
                white-space: nowrap;
                pointer-events: none;
                letter-spacing: 0.3px;
                opacity: 0.9;
                text-transform: uppercase;
            }

            /* Filtro de Daltonismo */
            .category-colorblind {
                margin-bottom: 20px;
                padding: 12px 16px;
                background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
                border: 2px solid rgba(168, 85, 247, 0.3);
                border-radius: 12px;
            }

            .colorblind-label {
                font-size: 13px;
                font-weight: 600;
                color: #a855f7;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .colorblind-select {
                width: 100%;
                padding: 10px 12px;
                background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                color: #e2e8f0;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .colorblind-select:hover {
                border-color: #a855f7;
                background: rgba(0,0,0,0.4);
            }

            .colorblind-select:focus {
                outline: 2px solid #a855f7;
                outline-offset: 2px;
            }

            .colorblind-select option {
                background: #1e293b;
                color: #e2e8f0;
            }

            /* Rodapé do Menu */
            .menu-footer {
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }

            .reset-button {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%);
                border: 2px solid rgba(239, 68, 68, 0.4);
                border-radius: 10px;
                color:#ef4444;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .reset-button:hover {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.3) 100%);
                border-color: #ef4444;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }

            .reset-button:focus-visible {
                outline: 3px solid #ef4444 !important;
                outline-offset: 2px !important;
            }

            .reset-button span {
                font-size: 18px;
            }

            /* Animação de entrada escalonada */
            .acess-category:nth-child(1) { animation-delay: 0s; }
            .acess-category:nth-child(2) { animation-delay: 0.1s; }
            .acess-category:nth-child(3) { animation-delay: 0.2s; }
            .acess-category:nth-child(4) { animation-delay: 0.3s; }
            .acess-category:nth-child(5) { animation-delay: 0.4s; }

            /* Highlight Links Feature */
            body.inclua-highlight-links a {
                background-color: var(--inclua-link-highlight-color, #ffff00) !important;
                color: black !important;
                outline: 2px solid #000 !important;
                text-decoration: underline !important;
                font-weight: bold !important;
                box-shadow: 0 0 5px var(--inclua-link-highlight-shadow, rgba(255,255,0,0.8)) !important;
            }

            /* Link highlight color select inside card */
            .link-highlight-select {
                width: 100%;
                margin-top: 6px;
                padding: 4px 6px;
                background: rgba(0,0,0,0.35);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 6px;
                color: #e2e8f0;
                font-size: 11px;
                cursor: pointer;
                transition: border-color 0.2s;
            }

            .link-highlight-select:hover {
                border-color: rgba(255,255,255,0.5);
            }

            .link-highlight-select:focus {
                outline: 2px solid #3b82f6;
                outline-offset: 1px;
            }

            .link-highlight-select option {
                background: #1e293b;
                color: #e2e8f0;
            }

            /* Voice Indicator */
            #inclua-voice-indicator {
                position: fixed;
                bottom: 100px;
                left: 20px;
                background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 30px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 8px 25px rgba(236, 72, 153, 0.4);
                z-index: 999998;
                animation: voiceSlideIn 0.3s ease;
            }

            @keyframes voiceSlideIn {
                from { transform: translateX(-100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            .voice-pulse {
                width: 12px;
                height: 12px;
                background: white;
                border-radius: 50%;
                animation: voicePulse 1s ease-in-out infinite;
            }

            @keyframes voicePulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.5); opacity: 0.5; }
            }

            /* Focus Mode */
            #inclua-focus-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 99990;
                pointer-events: none;
                transition: opacity 0.3s;
            }

            body.inclua-focus-active * {
                transition: all 0.2s ease;
            }

            .focus-highlighted {
                position: relative;
                z-index: 99995 !important;
                background: white !important;
                color: black !important;
                box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.3), 
                            0 0 40px rgba(255, 255, 255, 0.5),
                            0 0 80px rgba(139, 92, 246, 0.3) !important;
                border-radius: 8px !important;
                padding: 16px !important;
                margin: -8px !important;
            }

            .focus-highlighted * {
                color: black !important;
            }

            img.focus-highlighted,
            picture.focus-highlighted,
            figure.focus-highlighted,
            video.focus-highlighted {
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                border-radius: 4px !important;
                opacity: 1 !important;
                filter: none !important;
                transform: none;
                outline: 4px solid rgba(255, 255, 255, 0.9) !important;
                box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.3),
                            0 0 40px rgba(255, 255, 255, 0.5),
                            0 0 80px rgba(139, 92, 246, 0.4) !important;
            }

            figure.focus-highlighted {
                padding: 12px !important;
                background: white !important;
            }

            body.inclua-focus-no-images img,
            body.inclua-focus-no-images picture,
            body.inclua-focus-no-images video,
            body.inclua-focus-no-images figure:not(:has(figcaption)) {
                display: none !important;
            }

            body.inclua-focus-no-images figure {
                background: rgba(0,0,0,0.1);
                border: 1px dashed rgba(255,255,255,0.2);
                border-radius: 4px;
                min-height: 0;
            }

            /* Responsivo */
            @media (max-width: 400px) {
                .category-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .feature-card {
                    min-height: 90px;
                }

                #inclua-voice-indicator {
                    bottom: 80px;
                    left: 10px;
                    padding: 8px 15px;
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    injectHelpStyles() {
        if (document.getElementById('inclua-help-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'inclua-help-styles';
        styles.textContent = `
            /* Help Screen */
            .help-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                animation: fadeIn 0.2s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .help-content {
                background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
                border-radius: 20px;
                padding: 0;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            .help-header {
                background: rgba(16, 185, 129, 0.1);
                padding: 20px 24px;
                border-bottom: 2px solid rgba(16, 185, 129, 0.3);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .help-header h2 {
                margin: 0;
                color: #10b981;
                font-size: 24px;
                font-weight: 700;
            }

            .help-close {
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.5);
                color: #ef4444;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .help-close:hover {
                background: rgba(239, 68, 68, 0.3);
                transform: scale(1.1);
            }

            .help-close:focus {
                outline: 3px solid #10b981;
                outline-offset: 2px;
            }

            .help-body {
                padding: 24px;
                overflow-y: auto;
                max-height: calc(80vh - 80px);
            }

            .help-section {
                margin-bottom: 24px;
            }

            .help-section h3 {
                color: #e2e8f0;
                font-size: 16px;
                margin: 0 0 12px 0;
                font-weight: 600;
            }

            .help-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .help-list li {
                padding: 8px 0;
                color: #cbd5e1;
                font-size: 14px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .help-list li:last-child {
                border-bottom: none;
            }

            kbd {
                background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
                border: 1px solid #475569;
                border-radius: 4px;
                padding: 2px 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                color: #10b981;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            /* Foco Visual Aprimorado */
            .feature-button:focus-visible,
            button:focus-visible,
            select:focus-visible {
                outline: 3px solid #10b981 !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.2) !important;
            }

            .feature-button:focus {
                z-index: 10;
                transform: scale(1.02);
            }

            /* Screen Reader Only */
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
        `;
        document.head.appendChild(styles);
    }

    resetSettings() {
        localStorage.removeItem('inclua-ai-settings');
        location.reload();
    }

    // ==========================================================================
    // IMAGEM A PARTIR DE TEXTO SELECIONADO
    // ==========================================================================

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Os modos "selecionar texto" não podem ficar ligados ao mesmo tempo (abririam dois resultados)
    disableSelectionModes(exceptAction) {
        const modes = [
            ['textSummarizer', 'summarize-text', () => this.toggleTextSummarizer()],
            ['didacticSummary', 'didactic-summary', () => this.toggleDidacticSummary()],
            ['textToImage', 'text-to-image', () => this.toggleTextToImage()],
            ['librasRequest', 'libras-request', () => this.toggleLibrasRequest()]
        ];
        for (const [key, action, turnOff] of modes) {
            if (action !== exceptAction && this.settings[key]) {
                turnOff();
                const btn = document.querySelector(`[data-action="${action}"]`);
                if (btn) this.updateButtonVisuals(btn);
            }
        }
    }

    toggleTextToImage() {
        this.settings.textToImage = !this.settings.textToImage;

        if (this.settings.textToImage) {
            this.disableSelectionModes('text-to-image');
            if (!this.boundHandleTextToImage) {
                this.boundHandleTextToImage = this.handleTextToImage.bind(this);
            }
            document.addEventListener('mouseup', this.boundHandleTextToImage);
            this.showToast('Selecione um texto para gerar uma imagem', 'info');
        } else {
            if (this.boundHandleTextToImage) {
                document.removeEventListener('mouseup', this.boundHandleTextToImage);
            }
            this.showToast('Imagem do texto desativada', 'info');
        }
    }

    async handleTextToImage(event) {
        if (this.activeModal || !this.settings.textToImage) return;
        const text = this.takeSelection(event, 10);
        if (!text) return;
        await this.generateImageFromText(text);
    }

    async generateImageFromText(text) {
        if (this.imageBusy) return;
        this.imageBusy = true;
        this.showLoading('text-to-image', '🎨 Criando imagem... pode levar alguns segundos');
        try {
            const response = await this.fetchWithTimeout(`${this.getApiBaseUrl()}/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.slice(0, 3000) })
            }, 120000);
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.image) throw new Error(data.error || 'Falha na API');

            this.hideLoading('text-to-image');
            this.showImageResult(text, data.image);
            this.showToast('✅ Imagem criada!', 'success');
        } catch (error) {
            this.hideLoading('text-to-image');
            this.showToast(error.name === 'AbortError' ? 'A imagem demorou demais. Tente de novo.' : (error.message || 'Erro ao gerar imagem'), 'error');
        } finally {
            this.imageBusy = false;
        }
    }

    showImageResult(text, dataUrl) {
        const short = text.length > 140 ? text.slice(0, 140) + '…' : text;
        const safe = this.escapeHtml(short);
        this.showModal('🎨 Imagem do Texto', `
            <div class="ai-result-container">
                <figure class="gen-image-figure">
                    <img class="gen-image" src="${dataUrl}" alt="Imagem criada por IA para o texto: ${safe}">
                    <figcaption>${safe}</figcaption>
                </figure>
                <div class="gen-image-actions">
                    <button type="button" class="btn btn-primary" data-gen="again">Gerar outra versão</button>
                    <a class="btn btn-secondary" data-gen="download" href="${dataUrl}" download="inclua-ai-imagem.jpg">Baixar imagem</a>
                </div>
            </div>
        `);
        const overlay = this.activeModal;
        const again = overlay && overlay.querySelector('[data-gen="again"]');
        if (again) {
            again.addEventListener('click', () => {
                overlay.querySelector('.modal-close').click();
                this.generateImageFromText(text);
            });
        }
    }

    // ==========================================================================
    // CHATBOT ASSISTENTE (IA + voz de entrada e saída)
    // ==========================================================================

    openChatbot() {
        // Atalho de abrir também fecha (alterna)
        if (document.getElementById('chatbot-modal')) { this.closeChatbot(); return; }
        if (!this.chatHistory) this.chatHistory = [];
        this.chatSpeechToken = this.chatSpeechToken || 0;
        this.chatHandsFree = false;
        this.chatBusy = false;

        // O reconhecimento de voz do chat não pode competir com o de "Controle por voz"
        this.chatPausedVoiceCommands = !!(this.settings.voiceCommands && this.isListening);
        if (this.chatPausedVoiceCommands) this.stopVoiceRecognition();

        // O assistente sempre abre com a leitura em voz alta ligada (pensado para quem não enxerga).
        // Desligar vale só enquanto o chat está aberto e não fica salvo.
        this.settings.chatSpeak = true;
        const speakOn = true;
        const overlay = document.createElement('div');
        overlay.className = 'inclua-chat-overlay';
        overlay.id = 'chatbot-modal';
        overlay.innerHTML = `
            <div class="inclua-chat-dialog" role="dialog" aria-modal="true" aria-labelledby="chatbot-title">
                <div class="inclua-chat-header">
                    <h3 class="inclua-chat-title" id="chatbot-title">💬 Assistente Inclua-AI</h3>
                    <button type="button" class="inclua-chat-close" id="chat-close" aria-label="Fechar chat" title="Fechar (Esc)">✕</button>
                </div>
                <div class="chat-body">
                    <div class="chat-log" id="chat-log" role="log" aria-label="Conversa com o assistente" aria-live="${speakOn ? 'off' : 'polite'}" tabindex="0"></div>
                    <div class="chat-toolbar">
                        <button type="button" class="chat-toggle" id="chat-speak" aria-pressed="${speakOn}" aria-keyshortcuts="Alt+L"></button>
                        <button type="button" class="chat-toggle" id="chat-handsfree" aria-pressed="false" aria-keyshortcuts="Alt+C"></button>
                        <button type="button" class="chat-toggle" id="chat-stop" aria-keyshortcuts="Alt+P">⏹️ Parar áudio (Alt+P)</button>
                    </div>
                    <form class="chat-form" id="chat-form">
                        <label for="chat-input" class="chat-sr">Digite sua pergunta</label>
                        <input id="chat-input" type="text" autocomplete="off" maxlength="500" placeholder="Digite sua pergunta...">
                        <button type="button" class="chat-mic" id="chat-mic" aria-label="Falar sua pergunta pelo microfone. Atalho Alt M" aria-keyshortcuts="Alt+M" title="Falar (Alt+M)"><span aria-hidden="true">🎤</span></button>
                        <button type="submit" class="btn btn-primary" id="chat-send">Enviar</button>
                    </form>
                    <div class="chat-sr" id="chat-status" role="status" aria-live="polite"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.activeModal = overlay;

        const $ = (id) => overlay.querySelector('#' + id);
        const input = $('chat-input');

        // Reexibe a conversa anterior (se houver) ou cumprimenta
        if (this.chatHistory.length) {
            this.chatHistory.forEach(m => this.addChatMessage(m.role === 'user' ? 'user' : 'bot', m.content));
        } else {
            const greeting = 'Olá! Eu sou o assistente do Inclua-AI. Posso explicar como instalar, como usar cada recurso e quais são os atalhos. Você pode digitar sua pergunta, apertar o botão do microfone, com o atalho Alt M, para falar, ou ligar a conversa por voz, sem usar as mãos, com o atalho Alt C.';
            this.addChatMessage('bot', greeting);
            if (speakOn) this.speakChat(greeting);
        }
        this.updateChatToggles();

        $('chat-close').addEventListener('click', () => this.closeChatbot());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeChatbot(); });

        $('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const value = input.value;
            input.value = '';
            this.sendChatMessage(value);
        });

        $('chat-mic').addEventListener('click', () => {
            if (this.chatRecognition) this.stopChatListening();
            else this.startChatListening();
        });

        $('chat-speak').addEventListener('click', () => {
            this.settings.chatSpeak = this.settings.chatSpeak === false;
            if (this.settings.chatSpeak === false) this.stopSpeaking();
            this.updateChatToggles();
        });

        $('chat-handsfree').addEventListener('click', () => {
            this.chatHandsFree = !this.chatHandsFree;
            if (this.chatHandsFree) {
                // Conversa por voz precisa das respostas em áudio
                if (this.settings.chatSpeak === false) { this.settings.chatSpeak = true; }
                this.updateChatToggles();
                this.setChatStatus('Conversa por voz ligada. Depois do sinal sonoro, fale sua pergunta.');
                this.speakChat('Conversa por voz ligada. Depois do sinal sonoro, fale sua pergunta.', () => this.startChatListening());
            } else {
                this.stopChatListening();
                this.stopSpeaking();
                this.updateChatToggles();
                this.setChatStatus('Conversa por voz desligada.');
            }
        });

        $('chat-stop').addEventListener('click', () => {
            const wasHandsFree = this.chatHandsFree;
            this.stopSpeaking();
            this.stopChatListening();
            this.chatHandsFree = false;
            this.updateChatToggles();
            this.setChatStatus(wasHandsFree ? 'Áudio parado. Conversa por voz desligada.' : 'Áudio parado.');
            this.showToast(wasHandsFree ? '⏹️ Áudio parado e conversa por voz desligada' : '⏹️ Áudio parado', 'info');
        });

        // Atalhos do chat valem em qualquer lugar da página enquanto ele estiver aberto
        // (mesmo se o foco sair de dentro da janela):
        // Esc fecha · Alt+L ler respostas · Alt+C conversa por voz · Alt+P parar áudio · Alt+M microfone
        this.chatKeyHandler = (e) => {
            if (!document.getElementById('chatbot-modal')) {
                document.removeEventListener('keydown', this.chatKeyHandler, true);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.closeChatbot();
                return;
            }
            if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                const shortcuts = { KeyL: 'chat-speak', KeyC: 'chat-handsfree', KeyP: 'chat-stop', KeyM: 'chat-mic' };
                const targetId = shortcuts[e.code];
                if (targetId) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    if (!e.repeat) overlay.querySelector('#' + targetId).click();
                    return;
                }
            }
            if (e.key === 'Tab') {
                const focusable = Array.from(overlay.querySelectorAll('button:not([hidden]), input, [tabindex="0"]'))
                    .filter(el => !el.disabled && el.offsetParent !== null);
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (!overlay.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
                else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', this.chatKeyHandler, true);

        input.focus();
    }

    closeChatbot() {
        const modal = document.getElementById('chatbot-modal');
        if (!modal) return;
        if (this.chatKeyHandler) document.removeEventListener('keydown', this.chatKeyHandler, true);
        this.chatHandsFree = false;
        this.stopChatListening();
        this.stopSpeaking();
        modal.remove();
        this.activeModal = null;
        document.getElementById('inclua-ai-toggle')?.focus();

        // Devolve o Controle por voz, se estava ativo
        if (this.chatPausedVoiceCommands && this.settings.voiceCommands) {
            this.chatPausedVoiceCommands = false;
            this.initVoiceRecognition();
        }
    }

    setChatStatus(text) {
        const el = document.getElementById('chat-status');
        if (el) el.textContent = text;
    }

    updateChatToggles() {
        const speak = document.getElementById('chat-speak');
        const hands = document.getElementById('chat-handsfree');
        const log = document.getElementById('chat-log');
        const speakOn = this.settings.chatSpeak !== false;
        if (speak) {
            speak.setAttribute('aria-pressed', String(speakOn));
            speak.textContent = `🔊 Ler respostas em voz alta: ${speakOn ? 'ligado' : 'desligado'} (Alt+L)`;
        }
        if (hands) {
            hands.setAttribute('aria-pressed', String(!!this.chatHandsFree));
            hands.textContent = `🎙️ Conversa por voz, sem usar as mãos: ${this.chatHandsFree ? 'ligada' : 'desligada'} (Alt+C)`;
        }
        // Com voz ligada, o leitor de tela não anuncia as mensagens (evita falar duas vezes)
        if (log) log.setAttribute('aria-live', speakOn ? 'off' : 'polite');
    }

    addChatMessage(role, text, typing = false) {
        const log = document.getElementById('chat-log');
        if (!log) return null;
        const wrap = document.createElement('div');
        wrap.className = `chat-msg ${role}${typing ? ' typing' : ''}`;
        const who = document.createElement('span');
        who.className = 'chat-who';
        who.textContent = role === 'user' ? 'Você' : 'Assistente';
        const body = document.createElement('p');
        body.textContent = text;
        wrap.append(who, body);
        log.appendChild(wrap);
        log.scrollTop = log.scrollHeight;
        return wrap;
    }

    async sendChatMessage(rawText) {
        const text = (rawText || '').trim();
        if (!text || this.chatBusy) return;
        // Em conversa por voz, "tchau", "obrigado", "não tenho mais dúvidas" encerram a conversa
        if (this.chatHandsFree && this.isChatGoodbye(text)) {
            this.endHandsFreeConversation(text);
            return;
        }
        this.chatBusy = true;
        this.stopSpeaking();

        this.addChatMessage('user', text);
        this.chatHistory.push({ role: 'user', content: text });
        const typing = this.addChatMessage('bot', 'Pensando...', true);
        this.setChatStatus('Pensando...');

        let reply = '';
        let failed = false;
        try {
            const response = await this.fetchWithTimeout(`${this.getApiBaseUrl()}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: this.chatHistory })
            }, 30000);
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.reply) throw new Error(data.error || 'Falha na API');
            reply = data.reply;
        } catch (error) {
            failed = true;
            this.chatHistory.pop(); // não guarda a pergunta que falhou
            reply = error.name === 'AbortError'
                ? 'Desculpe, a resposta demorou demais. Tente de novo.'
                : 'Desculpe, não consegui responder agora. Verifique se o servidor está ligado e tente de novo. Se precisar de ajuda de uma pessoa, fale com o NAPNE pelo telefone (35) 3571-5922 ou pelo e-mail napne@muz.ifsuldeminas.edu.br.';
        }

        if (typing) typing.remove();
        // Se o chat foi fechado enquanto esperava, não faz mais nada
        if (!document.getElementById('chatbot-modal')) { this.chatBusy = false; return; }

        this.addChatMessage('bot', reply);
        if (!failed) this.chatHistory.push({ role: 'assistant', content: reply });
        this.setChatStatus('');
        this.chatBusy = false;

        const speakOn = this.settings.chatSpeak !== false;
        if (speakOn) {
            this.speakChat(reply, () => { if (this.chatHandsFree) this.startChatListening(); });
        } else if (this.chatHandsFree) {
            this.startChatListening();
        }
    }

    isChatGoodbye(text) {
        const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!t || t.split(' ').length > 12) return false;
        // Se tem pergunta no meio ("obrigado, como instalo...?"), não é despedida
        if (/\b(como|qual|quais|onde|quando|por que|porque|o que|quem|quanto|me ajuda|me explica)\b/.test(t)) return false;
        return /\b(tchau|ate logo|ate mais|ate a proxima|obrigad[oa]|valeu|era so isso|e so isso|so isso|e so|pode encerrar|vamos encerrar|encerrar a conversa|finalizar|nao tenho mais (nenhuma )?(duvida|duvidas|pergunta|perguntas)|nenhuma (duvida|pergunta)|nao tenho mais nada|nao preciso de mais nada)\b/.test(t);
    }

    endHandsFreeConversation(userText) {
        this.addChatMessage('user', userText);
        const farewell = 'Tudo bem! Vou encerrar a conversa por voz. Se precisar de mais alguma coisa, é só ativar a conversa por voz de novo.';
        this.addChatMessage('bot', farewell);
        this.chatHandsFree = false;
        this.stopChatListening();
        this.updateChatToggles();
        this.setChatStatus('Conversa por voz encerrada. Para ativar de novo, aperte Alt C.');
        this.speakChat(farewell);
    }

    // Fala o texto em frases (evita o corte de falas longas em alguns navegadores)
    speakChat(text, onDone) {
        if (!('speechSynthesis' in window)) { if (onDone) onDone(); return; }
        // E-mails ditos de forma compreensível: "napne arroba muz ponto ..."
        text = text.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, (m) => m.replace('@', ' arroba ').replace(/\./g, ' ponto '));
        // Telefones lidos número por número: (35) 3571-5922 -> "3 5, 3 5 7 1, 5 9 2 2"
        text = text.replace(/\(?\d{2}\)?\s?\d{4,5}-\d{4}/g, (m) => m.replace(/\D/g, '').replace(/^(\d{2})(\d+)(\d{4})$/, '$1,$2,$3').split('').join(' ').replace(/ , /g, ', '));
        speechSynthesis.cancel();
        const token = ++this.chatSpeechToken;
        const sentences = (text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || [text]).map(s => s.trim()).filter(Boolean);
        const chunks = [];
        let current = '';
        for (const s of sentences) {
            if ((current + ' ' + s).length > 180 && current) { chunks.push(current); current = s; }
            else current = current ? current + ' ' + s : s;
        }
        if (current) chunks.push(current);

        chunks.forEach((chunk, i) => {
            const u = new SpeechSynthesisUtterance(chunk);
            u.lang = 'pt-BR';
            u.rate = 1.0;
            const isLast = i === chunks.length - 1;
            u.onend = u.onerror = () => {
                if (token !== this.chatSpeechToken) return; // cancelada ou substituída
                if (isLast && onDone) onDone();
            };
            speechSynthesis.speak(u);
        });
    }

    stopSpeaking() {
        this.chatSpeechToken = (this.chatSpeechToken || 0) + 1;
        this.currentSpeech = null;
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            setTimeout(() => speechSynthesis.cancel(), 60);
        }
    }

    chatBeep() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 880;
            gain.gain.value = 0.08;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
            setTimeout(() => ctx.close(), 400);
        } catch (e) { /* sem som, segue sem o sinal */ }
    }

    startChatListening() {
        if (this.chatRecognition || this.chatBusy) return;
        if (!document.getElementById('chatbot-modal')) return;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            this.chatHandsFree = false;
            this.updateChatToggles();
            const msg = 'Seu navegador não suporta reconhecimento de voz. Use o Chrome ou o Edge, ou digite sua pergunta.';
            this.addChatMessage('bot', msg);
            if (this.settings.chatSpeak !== false) this.speakChat(msg);
            return;
        }

        this.stopSpeaking(); // o microfone não pode ouvir a própria voz do assistente
        const rec = new SR();
        rec.lang = 'pt-BR';
        rec.interimResults = false;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        this.chatRecognition = rec;
        const mic = document.getElementById('chat-mic');

        rec.onstart = () => {
            this.chatBeep();
            if (mic) { mic.classList.add('listening'); mic.setAttribute('aria-label', 'Ouvindo. Fale agora. Aperte para cancelar'); }
            this.setChatStatus('Ouvindo. Fale agora.');
        };

        rec.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.sendChatMessage(transcript);
        };

        rec.onerror = (event) => {
            let msg = '';
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                msg = 'Não tenho permissão para usar o microfone. Permita o microfone nas configurações do navegador.';
            } else if (event.error === 'no-speech') {
                msg = 'Não ouvi nada. Aperte o microfone para tentar de novo.';
            } else if (event.error !== 'aborted') {
                msg = 'Não consegui ouvir. Tente de novo ou digite sua pergunta.';
            }
            if (msg) {
                this.chatHandsFree = false;
                this.updateChatToggles();
                this.setChatStatus(msg);
                this.addChatMessage('bot', msg);
                if (this.settings.chatSpeak !== false) this.speakChat(msg);
            }
        };

        rec.onend = () => {
            if (this.chatRecognition === rec) this.chatRecognition = null;
            if (mic) { mic.classList.remove('listening'); mic.setAttribute('aria-label', 'Falar sua pergunta pelo microfone. Atalho Alt M'); }
        };

        try {
            rec.start();
        } catch (e) {
            this.chatRecognition = null;
        }
    }

    stopChatListening() {
        if (this.chatRecognition) {
            const rec = this.chatRecognition;
            this.chatRecognition = null;
            try { rec.abort(); } catch (e) { /* já parado */ }
        }
        const mic = document.getElementById('chat-mic');
        if (mic) { mic.classList.remove('listening'); mic.setAttribute('aria-label', 'Falar sua pergunta pelo microfone. Atalho Alt M'); }
    }

    // ==========================================================================
    // LIBRAS: avatar oficial (VLibras) e pedidos de tradução
    // ==========================================================================

    // Carrega e abre o avatar oficial do VLibras (gov.br). Ele traduz o texto que for selecionado na página.
    ensureVLibras() {
        const openAvatar = () => new Promise((resolve) => {
            window.VLibrasWidget.open();
            let tries = 0;
            const wait = () => {
                const root = document.getElementById('vlibras-app-root');
                if ((root && root.dataset.active === 'true') || ++tries > 50) {
                    // Na primeira abertura o avatar demora alguns segundos para ficar pronto
                    setTimeout(resolve, this.vlibrasOpenedOnce ? 300 : 4000);
                    this.vlibrasOpenedOnce = true;
                } else setTimeout(wait, 200);
            };
            wait();
        });

        return new Promise((resolve, reject) => {
            const start = () => {
                try { if (!window.VLibrasWidget || !window.VLibrasWidget.open) new window.VLibras.Widget('https://vlibras.gov.br/app'); }
                catch (e) { reject(e); return; }
                let tries = 0;
                const waitApi = () => {
                    if (window.VLibrasWidget && typeof window.VLibrasWidget.open === 'function') openAvatar().then(resolve);
                    else if (++tries > 50) reject(new Error('VLibras não iniciou'));
                    else setTimeout(waitApi, 150);
                };
                waitApi();
            };
            if (window.VLibras && window.VLibras.Widget) { start(); return; }
            const script = document.createElement('script');
            script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
            script.onload = start;
            script.onerror = () => reject(new Error('Não foi possível carregar o VLibras'));
            document.head.appendChild(script);
        });
    }

    hideVLibras() {
        const root = document.getElementById('vlibras-app-root');
        if (root) root.dataset.active = 'false';
    }

    // Faz o avatar traduzir o texto de um elemento: seleciona o texto e avisa o VLibras, que traduz a seleção
    async signWithVLibras(target) {
        try {
            await this.ensureVLibras();
        } catch (e) {
            this.showToast('Não foi possível abrir o avatar de Libras. O site pode estar bloqueando.', 'error');
            return;
        }
        if (!this.settings.librasHover || !document.body.contains(target)) return;
        this.librasSelecting = true; // evita que os outros recursos de "selecionar texto" reajam a esta seleção
        try {
            const range = document.createRange();
            range.selectNodeContents(target);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        } finally {
            this.librasSelecting = false;
        }
        setTimeout(() => window.getSelection().removeAllRanges(), 300);
    }

    // ---------- Libras por pedido ----------

    toggleLibrasRequest() {
        this.settings.librasRequest = !this.settings.librasRequest;
        if (this.settings.librasRequest) {
            this.disableSelectionModes('libras-request');
            if (!this.boundHandleLibrasRequest) this.boundHandleLibrasRequest = this.handleLibrasRequestSelection.bind(this);
            document.addEventListener('mouseup', this.boundHandleLibrasRequest);
            this.showToast('Selecione um texto para pedir a tradução em Libras', 'info');
        } else {
            if (this.boundHandleLibrasRequest) document.removeEventListener('mouseup', this.boundHandleLibrasRequest);
            this.showToast('Libras por pedido desativado', 'info');
        }
    }

    handleLibrasRequestSelection(event) {
        if (this.activeModal || !this.settings.librasRequest) return;
        const text = this.takeSelection(event, 3);
        if (text) this.confirmLibrasRequest(text);
    }

    confirmLibrasRequest(text) {
        const tooLong = text.length > 1000;
        const shown = this.escapeHtml(text.length > 400 ? text.slice(0, 400) + '…' : text);
        this.showModal('🤟 Pedir tradução em Libras', `
            <div class="lr-box">
                <p>Este texto será enviado para um tradutor de Libras gravar um vídeo. Quando o vídeo estiver pronto, ele aparece em <strong>Meus Pedidos de Libras</strong>.</p>
                <blockquote class="lr-text">${shown}</blockquote>
                ${tooLong ? '<p role="alert"><strong>O texto passa de 1000 caracteres.</strong> Selecione um trecho menor.</p>' : ''}
                <div class="gen-image-actions">
                    <button type="button" class="btn btn-primary" data-lr="send" ${tooLong ? 'disabled' : ''}>Enviar pedido</button>
                    <button type="button" class="btn btn-secondary" data-lr="cancel">Cancelar</button>
                </div>
            </div>
        `);
        const overlay = this.activeModal;
        const close = () => overlay.querySelector('.modal-close').click();
        overlay.querySelector('[data-lr="cancel"]').addEventListener('click', close);
        overlay.querySelector('[data-lr="send"]').addEventListener('click', async (e) => {
            e.currentTarget.disabled = true;
            e.currentTarget.textContent = 'Enviando...';
            const result = await this.sendLibrasRequest(text);
            close();
            if (!result) return;
            if (result.status === 'done') {
                this.showLibrasVideo(text, result.id, 'Este texto já tinha sido traduzido. Aqui está o vídeo:');
            } else {
                this.showModal('✅ Pedido enviado', `
                    <div class="lr-box">
                        <p>Seu pedido foi enviado para os tradutores de Libras. Quando o vídeo estiver pronto, você será avisado e poderá assistir em <strong>Meus Pedidos de Libras</strong> (atalho Alt+Shift+Q).</p>
                    </div>
                `);
                this.announceToScreenReader('Pedido de tradução em Libras enviado');
            }
        });
    }

    async sendLibrasRequest(text) {
        try {
            const response = await this.fetchWithTimeout(`${this.getApiBaseUrl()}/libras/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, pageUrl: location.href })
            }, 20000);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o pedido.');

            const list = this.settings.librasRequests || [];
            if (!list.some(r => r.id === data.id)) {
                list.unshift({ id: data.id, text: text.slice(0, 1000), createdAt: new Date().toISOString(), status: data.status });
            }
            this.settings.librasRequests = list.slice(0, 50);
            this.saveSettings();
            return data;
        } catch (error) {
            this.showToast(error.name === 'AbortError' ? 'O servidor demorou para responder. Tente de novo.' : error.message, 'error');
            return null;
        }
    }

    // Atualiza a situação dos pedidos guardados. Devolve os que ficaram prontos agora.
    async refreshLibrasStatuses() {
        const list = this.settings.librasRequests || [];
        const waiting = list.filter(r => r.status !== 'done');
        if (!waiting.length) return [];
        try {
            const ids = waiting.map(r => r.id).join(',');
            const response = await this.fetchWithTimeout(`${this.getApiBaseUrl()}/libras/status?ids=${ids}`, {}, 15000);
            if (!response.ok) return [];
            const data = await response.json();
            const readyNow = [];
            (data.requests || []).forEach(s => {
                const item = list.find(r => r.id === s.id);
                if (item && item.status !== s.status) {
                    item.status = s.status;
                    if (s.status === 'done') readyNow.push(item);
                }
            });
            if (readyNow.length) this.saveSettings();
            return readyNow;
        } catch (e) {
            return [];
        }
    }

    async checkLibrasReady() {
        const readyNow = await this.refreshLibrasStatuses();
        if (readyNow.length) {
            const msg = readyNow.length === 1
                ? '🤟 Seu vídeo em Libras está pronto! Abra "Meus Pedidos de Libras" (Alt+Shift+Q).'
                : `🤟 ${readyNow.length} vídeos em Libras estão prontos! Abra "Meus Pedidos de Libras" (Alt+Shift+Q).`;
            this.showToast(msg, 'success');
        }
    }

    async openLibrasRequests() {
        if ((this.settings.librasRequests || []).length) await this.refreshLibrasStatuses();
        const list = this.settings.librasRequests || [];

        if (!list.length) {
            this.showModal('🤟 Meus Pedidos de Libras', `
                <div class="lr-box"><p>Você ainda não pediu nenhuma tradução. Ligue <strong>Libras por Pedido</strong> (Alt+Shift+P), selecione um texto e envie o pedido.</p></div>
            `);
            return;
        }

        const items = list.map(r => {
            const done = r.status === 'done';
            const excerpt = this.escapeHtml(r.text.length > 160 ? r.text.slice(0, 160) + '…' : r.text);
            return `
                <li class="lr-item">
                    <p class="lr-item-text">${excerpt}</p>
                    <p class="lr-item-status ${done ? 'ready' : ''}">${done ? '✅ Pronto' : '⏳ Aguardando o tradutor'}</p>
                    <div class="gen-image-actions">
                        ${done ? `<button type="button" class="btn btn-primary" data-lr-watch="${r.id}">Assistir em Libras</button>` : ''}
                        <button type="button" class="btn btn-secondary" data-lr-remove="${r.id}">Remover da lista</button>
                    </div>
                </li>`;
        }).join('');

        this.showModal('🤟 Meus Pedidos de Libras', `<ul class="lr-list">${items}</ul>`);
        const overlay = this.activeModal;
        overlay.querySelectorAll('[data-lr-watch]').forEach(btn => btn.addEventListener('click', () => {
            const item = list.find(r => r.id === btn.dataset.lrWatch);
            overlay.querySelector('.modal-close').click();
            if (item) this.showLibrasVideo(item.text, item.id);
        }));
        overlay.querySelectorAll('[data-lr-remove]').forEach(btn => btn.addEventListener('click', () => {
            this.settings.librasRequests = (this.settings.librasRequests || []).filter(r => r.id !== btn.dataset.lrRemove);
            this.saveSettings();
            overlay.querySelector('.modal-close').click();
            this.openLibrasRequests();
        }));
    }

    showLibrasVideo(text, id, intro = '') {
        const url = `${this.getApiBaseUrl()}/libras/video/${encodeURIComponent(id)}`;
        const shown = this.escapeHtml(text.length > 400 ? text.slice(0, 400) + '…' : text);
        this.showModal('🤟 Tradução em Libras', `
            <div class="lr-box">
                ${intro ? `<p>${this.escapeHtml(intro)}</p>` : ''}
                <video class="lr-video" controls autoplay playsinline src="${url}" aria-label="Vídeo em Libras do texto: ${shown}"></video>
                <blockquote class="lr-text">${shown}</blockquote>
            </div>
        `);
    }
}

// Inicialização segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.incluaAIWidget = new IncluaAIWidget());
} else {
    window.incluaAIWidget = new IncluaAIWidget();
}
