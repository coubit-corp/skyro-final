// Mensagens do Supabase Auth em português, para as telas de entrada e de senha.

/** Traduz as mensagens mais comuns do Supabase Auth. */
export function friendlyError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos. Confira e tente de novo.'
  if (/already registered/i.test(message)) return 'Este e-mail já tem cadastro. Use "Entrar" ou recupere a senha.'
  if (/password should be at least/i.test(message)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (/rate limit|too many/i.test(message)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  if (/failed to fetch|network/i.test(message)) return 'Sem conexão com o servidor. Verifique sua internet.'
  return message
}
