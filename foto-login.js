/* Foto de la pantalla de entrada.
   Se carga desde el sitio de la empresa en vez de ir incrustada en la app:
   así se cambia subiendo otra imagen a la página, sin tocar el código, y la
   app no engorda. El service worker la guarda en el celular, de modo que
   después abre sin señal. Si algún día la imagen deja de estar, la pantalla
   usa el degradado azul y no se rompe. */
window.FOTO_LOGIN =
  "https://hidrovalsas.com/wp-content/uploads/2022/08/fondo-e1744729782265.jpeg";
