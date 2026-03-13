// ══════════════════════════════════════════════
//  app.js · VotaPerú 2026
//  Paso 3: Supabase real — auth + votos + datos
// ══════════════════════════════════════════════

import {
  obtenerPartidos,
  obtenerCandidatos,
  registrarVoto,
  yaVotoElUsuario,
  login,
  registro,
  cerrarSesion,
  escucharSesion
} from './supabase.js'

// ── ESTADO GLOBAL ──
let PARTIDOS   = []
let CANDIDATOS = []
let usuarioActual = null
let yaVoto = false

// ══════════════════════════════════════════════
//  ARRANQUE
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Cargar datos iniciales
  mostrarCargando(true)
  await cargarDatos()
  mostrarCargando(false)

  // 2. Render inicial de encuesta
  await renderEncuesta()

  // 3. Escuchar cambios de sesión (login / logout automático)
  escucharSesion(async (usuario) => {
    usuarioActual = usuario
    actualizarHeaderUsuario()

    if (usuario) {
      yaVoto = await yaVotoElUsuario()
      document.getElementById('aviso-login').style.display = 'none'
    } else {
      yaVoto = false
      document.getElementById('aviso-login').style.display = 'block'
    }

    await renderEncuesta()
  })
})

// ══════════════════════════════════════════════
//  CARGA DE DATOS
// ══════════════════════════════════════════════
async function cargarDatos() {
  const [partidos, candidatos] = await Promise.all([
    obtenerPartidos(),
    obtenerCandidatos()
  ])
  PARTIDOS   = partidos
  CANDIDATOS = candidatos
}

function mostrarCargando(estado) {
  const el = document.getElementById('lista-candidatos')
  if (!el) return
  if (estado) {
    el.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--gris);font-size:0.9rem">
        Cargando datos...
      </div>`
  }
}

// ══════════════════════════════════════════════
//  NAVEGACIÓN
// ══════════════════════════════════════════════
window.mostrarSeccion = async function(id, btn) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'))
  document.getElementById(id).classList.add('activa')
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('activo'))
  if (btn) btn.classList.add('activo')

  // Recarga datos frescos en cada sección
  await cargarDatos()

  if (id === 'inicio')     renderEncuesta()
  if (id === 'partidos')   renderPartidos()
  if (id === 'candidatos') { poblarFiltros(); renderCandidatos() }
  if (id === 'comparador') { poblarFiltrosComp(); renderComparador() }
}

// ══════════════════════════════════════════════
//  HEADER — usuario logueado
// ══════════════════════════════════════════════
function actualizarHeaderUsuario() {
  const btn = document.querySelector('.btn-login')
  if (!btn) return

  if (usuarioActual) {
    const nombre = usuarioActual.email.split('@')[0]
    btn.textContent = `${nombre} · Salir`
    btn.onclick = async () => {
      await cerrarSesion()
    }
  } else {
    btn.textContent = 'Iniciar sesión'
    btn.onclick = abrirModal
  }
}

// ══════════════════════════════════════════════
//  RENDER: ENCUESTA
// ══════════════════════════════════════════════
async function renderEncuesta() {
  const contenedor = document.getElementById('lista-candidatos')
  if (!contenedor) return

  // Siempre recarga los datos frescos desde Supabase
  await cargarDatos()

  if (CANDIDATOS.length === 0) {
    contenedor.innerHTML = `<p style="text-align:center;color:var(--gris);padding:1.5rem;font-size:.9rem">
      La encuesta se activará cuando el administrador agregue los candidatos.</p>`
    document.getElementById('total-votos').textContent = '0 votos registrados'
    return
  }

  const totalVotos = CANDIDATOS.reduce((acc, c) => acc + (c.votos || 0), 0)

  contenedor.innerHTML = CANDIDATOS.map(c => {
    const partido = PARTIDOS.find(p => p.id === c.partido_id) || {}
    const pct = totalVotos > 0 ? Math.round(((c.votos || 0) / totalVotos) * 100) : 0
    const cursor = yaVoto || !usuarioActual ? 'default' : 'pointer'

    // Foto o círculo de color
    const fotoHtml = c.foto_url
      ? `<img src="${c.foto_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid var(--borde)" alt="${c.nombre}" />`
      : `<div style="width:36px;height:36px;border-radius:50%;background:${partido.color||'#999'};flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:.75rem;color:white">${c.nombre.split(' ').slice(0,2).map(n=>n[0]).join('')}</div>`

    return `
      <div class="candidato-opcion" onclick="votar(${c.id})" style="cursor:${cursor}">
        ${fotoHtml}
        <div style="flex:1;min-width:0">
          <div class="candidato-nombre">${c.nombre}</div>
          <div class="candidato-partido">${partido.nombre || ''}</div>
        </div>
        <div class="barra-wrap" style="max-width:120px">
          <div class="barra-fill" style="width:${pct}%"></div>
        </div>
        <div class="porcentaje">${pct}%</div>
      </div>`
  }).join('')

  document.getElementById('total-votos').textContent =
    `${totalVotos.toLocaleString()} votos registrados`
}

window.votar = async function(candidatoId) {
  if (!usuarioActual) {
    abrirModal()
    return
  }
  if (yaVoto) {
    mostrarToast('Ya registraste tu voto. Solo se permite uno por cuenta.')
    return
  }

  // Bloquear clicks mientras se procesa
  document.querySelectorAll('.candidato-opcion').forEach(el => {
    el.style.pointerEvents = 'none'
  })

  const resultado = await registrarVoto(candidatoId)

  if (resultado.ok) {
    yaVoto = true
    const cand = CANDIDATOS.find(c => c.id === candidatoId)
    if (cand) cand.votos = (cand.votos || 0) + 1
    mostrarToast('✓ Voto registrado correctamente.')
    renderEncuesta()
    setTimeout(() => {
      const idx = CANDIDATOS.findIndex(c => c.id === candidatoId)
      const opciones = document.querySelectorAll('.candidato-opcion')
      if (opciones[idx]) opciones[idx].classList.add('votado')
    }, 50)
  } else {
    mostrarToast(resultado.mensaje, true)
    document.querySelectorAll('.candidato-opcion').forEach(el => {
      el.style.pointerEvents = 'auto'
    })
  }
}

// ══════════════════════════════════════════════
//  RENDER: PARTIDOS
// ══════════════════════════════════════════════
function renderPartidos() {
  const contenedor = document.getElementById('lista-partidos')
  if (!contenedor) return

  if (PARTIDOS.length === 0) {
    contenedor.innerHTML = `<p style="color:var(--gris);font-size:0.9rem">
      Aún no hay partidos cargados. Agrégalos desde el panel de admin.</p>`
    return
  }

  contenedor.innerHTML = PARTIDOS.map(p => {
    // Logo: imagen si existe, sino bloque de color con sigla
    let logoHtml
    if (p.logo_url) {
      logoHtml = `<img src="${p.logo_url}"
        style="width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0;border:1px solid var(--borde)"
        alt="${p.nombre}" />`
    } else {
      logoHtml = `<div class="partido-logo" style="background:${p.color}">${p.sigla}</div>`
    }

    return `
      <div class="tarjeta">
        <div class="partido-header">
          ${logoHtml}
          <div>
            <div class="partido-nombre">${p.nombre}</div>
            <div class="partido-sigla">${p.sigla} · Partido político</div>
          </div>
        </div>
        <ul class="propuestas-lista">
          ${(p.propuestas || []).map(prop => `<li>${prop}</li>`).join('')}
        </ul>
      </div>`
  }).join('')
}

// ══════════════════════════════════════════════
//  RENDER: CANDIDATOS
// ══════════════════════════════════════════════
function poblarFiltros() {
  const sel = document.getElementById('filtro-partido-cand')
  if (!sel) return
  sel.innerHTML = '<option value="">Todos los partidos</option>'
  PARTIDOS.forEach(p => {
    const opt = document.createElement('option')
    opt.value = p.id
    opt.textContent = p.nombre
    sel.appendChild(opt)
  })
}

window.renderCandidatos = function() {
  const filtroPartido = document.getElementById('filtro-partido-cand')?.value || ''
  const busqueda = (document.getElementById('buscar-candidato')?.value || '').toLowerCase()
  const contenedor = document.getElementById('lista-candidatos-full')
  if (!contenedor) return

  let lista = CANDIDATOS
  if (filtroPartido) lista = lista.filter(c => c.partido_id === filtroPartido)
  if (busqueda) lista = lista.filter(c => c.nombre.toLowerCase().includes(busqueda))

  if (lista.length === 0) {
    contenedor.innerHTML = '<p style="color:var(--gris);font-size:0.9rem">No se encontraron candidatos.</p>'
    return
  }

  contenedor.innerHTML = lista.map(c => {
    const partido = PARTIDOS.find(p => p.id === c.partido_id) || {}
    const iniciales = c.nombre.split(' ').slice(0, 2).map(n => n[0]).join('')
    const avatarHtml = c.foto_url
      ? `<img src="${c.foto_url}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin-bottom:4px;border:2px solid var(--borde)" alt="${c.nombre}" />`
      : `<div class="candidato-avatar" style="background:${partido.color || '#999'}">${iniciales}</div>`

    return `
      <div class="candidato-card">
        ${avatarHtml}
        <h3>${c.nombre}</h3>
        <span class="partido-tag" style="background:${partido.color || '#999'}">${partido.nombre || ''}</span>
        <div class="dato-grid">
          <div class="dato-item">
            <div class="dato-label">Edad</div>
            <div class="dato-valor">${c.edad} años</div>
          </div>
          <div class="dato-item">
            <div class="dato-label">Nacimiento</div>
            <div class="dato-valor">${c.nacimiento}</div>
          </div>
          <div class="dato-item">
            <div class="dato-label">Denuncias</div>
            <div class="dato-valor ${c.denuncias > 0 ? 'peligro' : ''}">${c.denuncias}</div>
          </div>
          <div class="dato-item">
            <div class="dato-label">Experiencia</div>
            <div class="dato-valor" style="font-size:0.8rem">${c.experiencia || '—'}</div>
          </div>
        </div>
        <div style="margin-top:8px">
          <div class="dato-label" style="margin-bottom:4px">Cargos previos</div>
          <ul style="font-size:0.8rem;color:var(--gris);line-height:1.8;list-style:none;padding:0">
            ${(c.cargos || []).map(cargo => `<li>→ ${cargo}</li>`).join('')}
          </ul>
        </div>
      </div>`
  }).join('')
}

// ══════════════════════════════════════════════
//  RENDER: COMPARADOR
// ══════════════════════════════════════════════
function poblarFiltrosComp() {
  const sel = document.getElementById('filtro-partido-comp')
  if (!sel) return
  sel.innerHTML = '<option value="">Todos los partidos</option>'
  PARTIDOS.forEach(p => {
    const opt = document.createElement('option')
    opt.value = p.id
    opt.textContent = p.nombre
    sel.appendChild(opt)
  })
}

window.renderComparador = function() {
  const filtroPartido = document.getElementById('filtro-partido-comp')?.value || ''
  const filtroCol = document.getElementById('filtro-columna')?.value || 'todo'
  const tbody = document.getElementById('tbody-comp')
  if (!tbody) return

  let lista = CANDIDATOS
  if (filtroPartido) lista = lista.filter(c => c.partido_id === filtroPartido)

  tbody.innerHTML = lista.map(c => {
    const partido = PARTIDOS.find(p => p.id === c.partido_id) || {}
    const mostrar = (col) => filtroCol === 'todo' || filtroCol === col

    return `
      <tr>
        <td><strong>${c.nombre}</strong></td>
        <td>
          <span style="background:${partido.color||'#999'};color:white;
            padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:600">
            ${partido.sigla || ''}
          </span>
        </td>
        <td>${mostrar('edad') ? c.edad : '—'}</td>
        <td>${filtroCol === 'todo' ? c.nacimiento : '—'}</td>
        <td>${mostrar('denuncias') || filtroCol === 'todo'
          ? `<span class="tag-denuncias">${c.denuncias} denuncia${c.denuncias !== 1 ? 's' : ''}</span>`
          : '—'}</td>
        <td>${mostrar('experiencia') ? (c.cargos || []).slice(0, 2).join(', ') : '—'}</td>
        <td>${mostrar('experiencia') ? (c.experiencia || '—') : '—'}</td>
      </tr>`
  }).join('')
}

// ══════════════════════════════════════════════
//  MODAL LOGIN / REGISTRO
// ══════════════════════════════════════════════
function abrirModal() {
  document.getElementById('modal-overlay').classList.add('abierto')
}
window.abrirModal = abrirModal

window.cerrarModal = function() {
  document.getElementById('modal-overlay').classList.remove('abierto')
  document.getElementById('modal-error').style.display = 'none'
}

window.cerrarModalSiFuera = function(e) {
  if (e.target === document.getElementById('modal-overlay')) window.cerrarModal()
}

window.cambiarTab = function(tab, btn) {
  document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('activo'))
  btn.classList.add('activo')
  document.getElementById('form-login').style.display    = tab === 'login'    ? 'block' : 'none'
  document.getElementById('form-registro').style.display = tab === 'registro' ? 'block' : 'none'
  document.getElementById('modal-error').style.display = 'none'
}

window.iniciarSesion = async function() {
  const email = document.getElementById('login-email').value.trim()
  const pass  = document.getElementById('login-pass').value
  const err   = document.getElementById('modal-error')

  if (!email || !pass) {
    err.textContent = 'Completa todos los campos.'
    err.style.display = 'block'
    return
  }

  const btn = document.querySelector('#form-login .btn-enviar')
  btn.textContent = 'Ingresando...'
  btn.disabled = true

  const resultado = await login(email, pass)

  btn.textContent = 'Ingresar'
  btn.disabled = false

  if (resultado.ok) {
    window.cerrarModal()
    mostrarToast('✓ Sesión iniciada correctamente.')
  } else {
    err.textContent = resultado.mensaje
    err.style.display = 'block'
  }
}

window.registrarse = async function() {
  const email = document.getElementById('reg-email').value.trim()
  const pass  = document.getElementById('reg-pass').value
  const err   = document.getElementById('modal-error')

  if (!email || !pass) {
    err.textContent = 'Completa todos los campos.'
    err.style.display = 'block'
    return
  }
  if (pass.length < 6) {
    err.textContent = 'La contraseña debe tener mínimo 6 caracteres.'
    err.style.display = 'block'
    return
  }

  const btn = document.querySelector('#form-registro .btn-enviar')
  btn.textContent = 'Creando cuenta...'
  btn.disabled = true

  const resultado = await registro(email, pass)

  btn.textContent = 'Crear cuenta'
  btn.disabled = false

  if (resultado.ok) {
    window.cerrarModal()
    mostrarToast('✓ Cuenta creada. Revisa tu correo para confirmar.')
  } else {
    err.textContent = resultado.mensaje
    err.style.display = 'block'
  }
}

// ══════════════════════════════════════════════
//  COMPARTIR / DESCARGAR
// ══════════════════════════════════════════════
window.descargarImagen = function() {
  mostrarToast('La descarga de imagen llega en el paso 6.')
}

window.compartirWhatsApp = function() {
  const total = CANDIDATOS.reduce((a, c) => a + (c.votos || 0), 0)
  if (total === 0) { mostrarToast('Aún no hay votos registrados.'); return }
  const lider = CANDIDATOS.reduce((a, b) => (b.votos || 0) > (a.votos || 0) ? b : a)
  const pct = Math.round(((lider.votos || 0) / total) * 100)
  const texto = encodeURIComponent(
    `📊 Encuesta Electoral Perú 2026\n` +
    `Líder: ${lider.nombre} con ${pct}%\n` +
    `Total: ${total.toLocaleString()} votos\n` +
    `Vota tú también 👉 ${window.location.href}`
  )
  window.open(`https://wa.me/?text=${texto}`, '_blank')
}

window.copiarEnlace = function() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    mostrarToast('✓ Enlace copiado al portapapeles.')
  })
}

// ══════════════════════════════════════════════
//  SOPORTE (EmailJS llega en paso 5)
// ══════════════════════════════════════════════
window.enviarSoporte = function() {
  const nombre  = document.getElementById('soporte-nombre').value.trim()
  const email   = document.getElementById('soporte-email').value.trim()
  const mensaje = document.getElementById('soporte-mensaje').value.trim()

  if (!nombre || !email || !mensaje) {
    mostrarToast('Por favor completa todos los campos.', true)
    return
  }

  document.getElementById('soporte-confirmacion').style.display = 'block'
  document.getElementById('soporte-nombre').value  = ''
  document.getElementById('soporte-email').value   = ''
  document.getElementById('soporte-mensaje').value = ''
}

// ══════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════
function mostrarToast(mensaje, esError = false) {
  const anterior = document.getElementById('toast-msg')
  if (anterior) anterior.remove()

  const toast = document.createElement('div')
  toast.id = 'toast-msg'
  toast.textContent = mensaje
  toast.style.cssText = `
    position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);
    background:${esError ? '#C8102E' : '#0D0D0D'};color:white;
    font-family:'DM Sans',sans-serif;font-size:0.88rem;
    padding:10px 22px;border-radius:8px;z-index:9999;
    box-shadow:0 4px 20px rgba(0,0,0,0.2);
  `
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3500)
}
