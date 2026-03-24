// Script para limpiar atributos inyectados por extensiones del navegador
// antes de que React hidrate la aplicación
(function() {
  // Atributos comunes inyectados por extensiones
  const extensionAttributes = [
    'bis_skin_checked',
    'bis_custom_element',
    'data-react-extension',
    '__reactprops',
    '__reactfiber',
    '_gs_',
    // Añade más atributos conocidos de extensiones aquí
  ];

  function cleanNode(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      extensionAttributes.forEach(attr => {
        if (node.hasAttribute(attr)) {
          node.removeAttribute(attr);
        }
      });
      
      // Limpiar recursivamente todos los hijos
      Array.from(node.children).forEach(child => cleanNode(child));
    }
  }

  // Limpiar el documento antes de que React cargue
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      cleanNode(document.body);
    });
  } else {
    cleanNode(document.body);
  }

  // También limpiar cuando el DOM cambie (para extensiones que inyectan dinámicamente)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            cleanNode(node);
          }
        });
      });
    });

    // Observar cambios en el body
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }
  }
})();
