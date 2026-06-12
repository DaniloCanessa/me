// Política de contraseñas del back-office. Se valida server-side (seguridad)
// y se muestra en pantalla (UX). Para endurecerla, agregar más checks aquí.

export const PASSWORD_RULES =
  'Mínimo 8 caracteres, con al menos una mayúscula y un carácter especial (ej: !@#$%).';

/** Devuelve un mensaje de error si la contraseña no cumple, o null si es válida. */
export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== 'string' || pw.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!/[A-Z]/.test(pw)) {
    return 'La contraseña debe incluir al menos una mayúscula.';
  }
  if (!/[^A-Za-z0-9]/.test(pw)) {
    return 'La contraseña debe incluir al menos un carácter especial (ej: !@#$%).';
  }
  return null;
}
