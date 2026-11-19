/**
 * Devuelve la ruta si es interna a la app ("/pacientes?x=1"), o "/" si no.
 * Evita redirecciones abiertas: un link de entrada con
 * ?siguiente=https://otro-sitio.com no debe sacar a nadie de la app.
 */
export function rutaInternaSegura(valor: unknown): string {
  if (typeof valor !== 'string') return '/'
  // "//otro-sitio.com" y "/\otro-sitio.com" los navegadores los toman como otro dominio.
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return '/'
  // Caracteres de control: algunos navegadores los ignoran y arman otra URL.
  if (/[\u0000-\u001f\u007f]/.test(valor)) return '/'
  return valor
}
