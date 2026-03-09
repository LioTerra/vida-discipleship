const errorMap: Record<string, string> = {
  // Password
  "Password should be at least 6 characters": "A senha deve ter no mínimo 6 caracteres.",
  "Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, 0123456789": "A senha deve conter pelo menos uma letra e um número.",
  "New password should be different from the old password.": "A nova senha deve ser diferente da senha atual.",
  "Auth session missing!": "Sessão expirada. Faça login novamente.",

  // Sign up
  "User already registered": "Este email já está cadastrado.",
  "Unable to validate email address: invalid format": "Formato de email inválido.",
  "Signup requires a valid password": "É necessário informar uma senha válida.",
  "To signup, please provide your email": "É necessário informar um email para se cadastrar.",

  // Sign in
  "Invalid login credentials": "Email ou senha inválidos.",
  "Email not confirmed": "Email ainda não confirmado. Verifique sua caixa de entrada.",
  "Invalid Refresh Token: Refresh Token Not Found": "Sessão expirada. Faça login novamente.",
  "Invalid Refresh Token: Already Used": "Sessão expirada. Faça login novamente.",

  // Recovery
  "For security purposes, you can only request this once every 60 seconds": "Por segurança, aguarde 60 segundos antes de solicitar novamente.",
  "Email rate limit exceeded": "Muitas solicitações. Aguarde alguns minutos.",
  "Email link is invalid or has expired": "O link é inválido ou expirou. Solicite um novo.",

  // Generic
  "Request rate limit reached": "Muitas requisições. Aguarde alguns instantes.",
};

export function translateAuthError(message: string): string {
  // Exact match
  if (errorMap[message]) return errorMap[message];

  // Partial match for rate limit variations
  if (message.includes("you can only request this after")) {
    const seconds = message.match(/after (\d+) seconds/)?.[1];
    return `Por segurança, aguarde ${seconds || "alguns"} segundos antes de solicitar novamente.`;
  }

  if (message.includes("rate limit")) {
    return "Muitas requisições. Aguarde alguns instantes.";
  }

  if (message.includes("Password should be at least")) {
    const chars = message.match(/at least (\d+)/)?.[1];
    return `A senha deve ter no mínimo ${chars || "6"} caracteres.`;
  }

  return message;
}
