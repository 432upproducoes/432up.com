/**
 * 432UP! Produções - Redirecionamento de URLs
 * Arquivo: redirect.js
 * Versão: 1.0.0
 * Data: 2026-04-11
 * 
 * Função: Corrige caminhos relativos quando acessado via /lp/pasta/
 */

(function() {
    'use strict';

    console.log('🔄 redirect.js v1.0.0 carregado');

    // Detecta se está em uma LP sem index.html
    const currentPath = window.location.pathname;
    
    // Verifica se é uma LP: /lp/algo/ (sem index.html)
    const lpMatch = currentPath.match(/^\/lp\/([^\/]+)\/?$/);
    
    if (lpMatch) {
        const lpName = lpMatch[1];
        console.log(`📍 Detectado acesso à LP: ${lpName}`);
        console.log(`🔗 URL atual: ${currentPath}`);
        
        // Se não termina com /, adiciona /
        if (!currentPath.endsWith('/')) {
            const newUrl = currentPath + '/';
            console.log(`➡️ Redirecionando para: ${newUrl}`);
            window.location.replace(newUrl);
            return;
        }
        
        // Define base href dinamicamente
        const baseTag = document.querySelector('base');
        if (!baseTag) {
            const newBase = document.createElement('base');
            newBase.href = `/lp/${lpName}/`;
            document.head.insertBefore(newBase, document.head.firstChild);
            console.log(`✅ Base href definida: /lp/${lpName}/`);
        }
    }
    
    // Log de debug
    console.log('📊 Informações de path:');
    console.log('  - pathname:', window.location.pathname);
    console.log('  - href:', window.location.href);
    console.log('  - base:', document.querySelector('base')?.href || 'não definida');

})();
