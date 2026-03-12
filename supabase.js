// ══════════════════════════════════════════════
//  supabase.js · Conexión a base de datos
//  IMPORTANTE: reemplaza los dos valores de abajo
//  con los de tu proyecto en supabase.com
// ══════════════════════════════════════════════
 
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 
// ── REEMPLAZA ESTOS DOS VALORES ──
const SUPABASE_URL  = 'https://qbogqnfjohadkvonxuyb.supabase.co'   // <-- tu Project URL
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFib2dxbmZqb2hhZGt2b254dXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDE0MDksImV4cCI6MjA4ODkxNzQwOX0.odTFUYmtPNkNXqO7H1FbYZ_1S6fIVzB_NRuW3a3ldTQ'                             // <-- tu anon public key
// ────────────────────────────────
 
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
 
 
// ══════════════════════════════════════════════
//  PARTIDOS
// ══════════════════════════════════════════════
 
export async function obtenerPartidos() {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
  if (error) { console.error('Error partidos:', error); return [] }
  return data
}
 
 
// ══════════════════════════════════════════════
//  CANDIDATOS
// ══════════════════════════════════════════════
 
export async function obtenerCandidatos() {
  const { data, error } = await supabase
    .from('candidatos')
    .select('*')
    .order('votos', { ascending: false })
  if (error) { console.error('Error candidatos:', error); return [] }
  return data
}
 
 
// ══════════════════════════════════════════════
//  VOTOS
// ══════════════════════════════════════════════
 
// Registra el voto de un usuario
// Retorna { ok: true } o { ok: false, mensaje: '...' }
export async function registrarVoto(candidatoId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, mensaje: 'Debes iniciar sesión para votar.' }
 
  // Insertar en tabla votos (el UNIQUE en user_id previene doble voto)
  const { error: errorVoto } = await supabase
    .from('votos')
    .insert({ user_id: user.id, candidato_id: candidatoId })
 
  if (errorVoto) {
    if (errorVoto.code === '23505') // unique violation
      return { ok: false, mensaje: 'Ya registraste tu voto anteriormente.' }
    return { ok: false, mensaje: 'Error al registrar el voto.' }
  }
 
  // Sumar +1 al candidato
  const { error: errorUpdate } = await supabase.rpc('incrementar_votos', {
    cand_id: candidatoId
  })
  if (errorUpdate) console.error('Error incrementando votos:', errorUpdate)
 
  return { ok: true }
}
 
// Verifica si el usuario ya votó
export async function yaVotoElUsuario() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
 
  const { data } = await supabase
    .from('votos')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
 
  return !!data
}
 
 
// ══════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════
 
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, mensaje: traduccirError(error.message) }
  return { ok: true, usuario: data.user }
}
 
export async function registro(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { ok: false, mensaje: traduccirError(error.message) }
  return { ok: true, usuario: data.user }
}
 
export async function cerrarSesion() {
  await supabase.auth.signOut()
}
 
export async function obtenerUsuarioActual() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
 
// Escucha cambios de sesión (login / logout)
export function escucharSesion(callback) {
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}
 
 
// ══════════════════════════════════════════════
//  TRADUCCIONES DE ERRORES
// ══════════════════════════════════════════════
function traduccirError(msg) {
  if (msg.includes('Invalid login credentials'))
    return 'Correo o contraseña incorrectos.'
  if (msg.includes('Email not confirmed'))
    return 'Confirma tu correo antes de ingresar.'
  if (msg.includes('User already registered'))
    return 'Este correo ya está registrado.'
  if (msg.includes('Password should be at least'))
    return 'La contraseña debe tener mínimo 6 caracteres.'
  return msg
}
