# 🚀 Extensão Inclua-AI para Chrome / Edge

A extensão carrega o widget do Inclua-AI **automaticamente em todas as páginas** que você visita. Sem favorito, sem clicar a cada site, e as configurações que você ativou **continuam valendo ao trocar de página ou de site**.

## 📦 Arquivos da Extensão

```
extensao/
├── manifest.json       # Configuração da extensão
├── background.js       # Service worker
├── content.js          # Injeta o widget e guarda as preferências
├── popup.html / .js    # Popup do ícone da extensão
├── welcome.html        # Página de boas-vindas
└── icons/              # Ícones da extensão
```

---

## ⚙️ Como instalar (modo desenvolvedor)

### 1. Inicie o servidor local
Na raiz do projeto:

```bash
cd servidor
npm install        # só na primeira vez
node server.js
```

O servidor sobe em `http://localhost:8080`. Confira em <http://localhost:8080/health> (deve responder `"status":"ok"`).

> Para a **descrição de imagem** funcionar, o arquivo `servidor/.env` precisa ter `GROQ_API_KEY=...` (chave gratuita em <https://console.groq.com/keys>).

### 2. Abra o gerenciador de extensões
- **Chrome**: digite `chrome://extensions` na barra de endereço
- **Edge**: digite `edge://extensions`

### 3. Ative o "Modo do desenvolvedor"
Chave no canto superior direito (Chrome) ou no menu lateral (Edge).

### 4. Carregue a extensão
Clique em **"Carregar sem compactação"** (Chrome) / **"Carregar descompactada"** (Edge) e selecione a pasta **`extensao/`** deste projeto.

### 5. Pronto ✅
Abra qualquer site (ou recarregue com `F5`). O ícone do Inclua-AI aparece sozinho na página.

> Dica: clique no ícone de quebra-cabeça 🧩 da barra do navegador e fixe o Inclua-AI para acessá-lo rápido.

### Atualizou o código da extensão?
Em `chrome://extensions`, clique no botão de **recarregar** (↻) no cartão do Inclua-AI e depois recarregue a página (`F5`).

---

## 💾 Preferências salvas em todos os sites

Tudo que a pessoa ativar no widget (tamanho da fonte, filtro de cor, destaque de links etc.) é guardado no `chrome.storage.local` da extensão e restaurado automaticamente em cada página nova, em qualquer site.

Para limpar, use a opção de resetar do widget ou remova a extensão.

---

## 🔧 Servidor usado

A extensão tenta carregar o widget, nesta ordem:
1. **Local**: `http://localhost:8080` (desenvolvimento)
2. **Produção**: `https://inclua-ai-servidor.onrender.com` (se o local estiver desligado)

O widget faz as chamadas de IA (descrição de imagem, resumo etc.) para o mesmo servidor de onde foi carregado.

---

## 🐛 Problemas comuns

### O widget não aparece
1. Confirme que a extensão está ligada em `chrome://extensions`.
2. Confirme que o servidor está rodando: <http://localhost:8080/health>.
3. Recarregue a página (`F5`) e veja o console (`F12`) por erros.

### "Erro ao descrever imagem"
- Verifique se `GROQ_API_KEY` está no `servidor/.env` e **reinicie o servidor** depois de alterar.
- Se estiver usando o servidor do Render, ele precisa estar com o código atualizado.
- Alguns sites (ex.: Instagram) têm regras de segurança (CSP) que podem bloquear scripts/chamadas para `localhost`. Veja o erro no console (`F12`).

### Configurações não persistem
Recarregue a extensão em `chrome://extensions` (↻) e a página. As preferências só são salvas depois que a pessoa muda alguma opção com a extensão carregada.

---

## 📝 Publicar na Chrome Web Store

1. Garanta ícones 16x16, 48x48 e 128x128 px.
2. Empacote:
   ```bash
   cd extensao
   zip -r ../inclua-ai-extension.zip *
   ```
3. Envie no [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 🔐 Privacidade

- Nenhum dado pessoal é coletado.
- Preferências ficam apenas no navegador (`chrome.storage.local`).
- Imagens e textos enviados para a IA são processados pelo servidor do Inclua-AI e pelo provedor de IA (Groq).

---

## 📄 Licença

MIT. Veja `LICENSE` para detalhes.

**Desenvolvido com ❤️ para uma web mais acessível**
