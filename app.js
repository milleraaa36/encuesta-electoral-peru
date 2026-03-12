// ══════════════════════════════════════════════
//  app.js · VotaPerú 2026
//  Paso 1: datos de ejemplo + lógica visual
//  (sin base de datos aún — todo en memoria)
// ══════════════════════════════════════════════

// ── DATOS DE EJEMPLO ──
// En el paso siguiente estos datos vendrán de Supabase.
// Por ahora están aquí para que veas cómo funciona todo.

const PARTIDOS = [
  {
    id: "fp",
    nombre: "Fuerza Popular",
    sigla: "FP",
    color: "#F4A01C",
    propuestas: [
      "Reducción del IGV al 16%",
      "Mano dura contra la corrupción",
      "Reactivación económica con inversión privada",
      "Defensa de la Constitución del 93"
    ]
  },
  {
    id: "pp",
    nombre: "Perú Libre",
    sigla: "PL",
    color: "#C8102E",
    propuestas: [
      "Nueva Constitución vía referéndum",
      "Estatización de recursos naturales",
      "Educación y salud 100% gratuitas",
      "Reforma agraria modernizada"
    ]
  },
  {
    id: "ap",
    nombre: "Acción Popular",
    sigla: "AP",
    color: "#1A6B3C",
    propuestas: [
      "Descentralización real del Estado",
      "Fortalecimiento de gobiernos regionales",
      "Agua potable para zonas rurales",
      "Lucha contra la informalidad"
    ]
  },
  {
    id: "av",
    nombre: "Avancemos",
    sigla: "AV",
    color: "#2563EB",
    propuestas: [
      "Modernización del Estado digital",
      "Inversión en ciencia y tecnología",
      "Reforma educativa con enfoque STEM",
      "Acuerdos de libre comercio ampliados"
    ]
  }
];

const CANDIDATOS = [
  {
    id: 1,
    nombre: "María López Rivas",
    partido: "fp",
    edad: 58,
    nacimiento: "Arequipa",
    denuncias: 2,
    cargos: ["Congresista 2016–2021", "Alcaldesa Arequipa 2010–2014"],
    experiencia: "14 años en política",
    votos: 0
  },
  {
    id: 2,
    nombre: "Carlos Mendoza Quispe",
    partido: "pp",
    edad: 63,
    nacimiento: "Puno",
    denuncias: 5,
    cargos: ["Gobernador Regional Puno", "Docente universitario"],
    experiencia: "8 años en política",
    votos: 0
  },
  {
    id: 3,
    nombre: "Ana Villanueva Torres",
    partido: "ap",
    edad: 51,
    nacimiento: "Cusco",
    denuncias: 0,
    cargos: ["Ministra de Educación 2019–2021", "Congresista 2021–2026"],
    experiencia: "10 años en política",
    votos: 0
  },
  {
    id: 4,
    nombre: "Roberto Sánchez Díaz",
    partido: "av",
    edad: 47,
    nacimiento: "Lima",
    denuncias: 1,
    cargos: ["Alcalde San Isidro 2018–2022", "Economista del MEF"],
    experiencia: "6 años en política",
    votos: 0
  }
];

// ── ESTADO GLOBAL ──
let usuarioActual = null;   // null = no logueado
let yaVoto = false;         // si ya votó en esta sesión
let votosSimulados = {      // votos de ejemplo para demostración
  1: 1240,
  2: 870,
  3: 1550,
  4: 640
};

// ══════════════════════════════════════════════
//  NAVEGACIÓN
// ══════════════════════════════════════════════
function mostrarSeccion(id, btn) {
  // Ocultar todas
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
  // Mostrar la pedida
  document.getElementById(id).classList.add('activa');
  // Actualizar botones nav
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('activo'));
  if (btn) btn.classList.add('activo');

  // Renderizar contenido según sección
  if (id === 'inicio')      renderEncuesta();
  if (id === 'partidos')    renderPartidos();
  if (id === 'candidatos')  { poblarFiltros(); renderCandidatos(); }
  if (id === 'comparador')  { poblarFiltrosComp(); renderComparador(); }
}

// ══════════════════════════════════════════════
//  RENDER: ENCUESTA (inicio)
// ══════════════════════════════════════════════
function renderEncuesta() {
  const totalVotos = Object.values(votosSimulados).reduce((a, b) => a + b, 0);
  const contenedor = document.getElementById('lista-candidatos');
  if (!contenedor) return;

  contenedor.innerHTML = CANDIDATOS.map(c => {
    const partido = PARTIDOS.find(p => p.id === c.partido);
    const votos = votosSimulados[c.id] || 0;
    const pct = totalVotos > 0 ? Math.round((votos / totalVotos) * 100) : 0;

    return `
      <div class="candidato-opcion ${yaVoto ? '' : 'clickeable'}"
           onclick="votar(${c.id})"
           style="cursor:${yaVoto ? 'default' : 'pointer'}">
        <div class="partido-color" style="background:${partido.color}"></div>
        <div style="flex:1;min-width:0">
          <div class="candidato-nombre">${c.nombre}</div>
          <div class="candidato-partido">${partido.nombre}</div>
        </div>
        <div class="barra-wrap" style="max-width:120px">
          <div class="barra-fill" style="width:${pct}%"></div>
        </div>
        <div class="porcentaje">${pct}%</div>
      </div>`;
  }).join('');

  document.getElementById('total-votos').textContent =
    `${totalVotos.toLocaleString()} votos registrados`;
}

function votar(candidatoId) {
  if (!usuarioActual) {
    abrirModal();
    return;
  }
  if (yaVoto) {
    alert('Ya registraste tu voto. Solo se permite un voto por cuenta.');
    return;
  }
  votosSimulados[candidatoId] = (votosSimulados[candidatoId] || 0) + 1;
  yaVoto = true;
  renderEncuesta();

  // Resaltar el candidato votado
  const opciones = document.querySelectorAll('.candidato-opcion');
  const idx = CANDIDATOS.findIndex(c => c.id === candidatoId);
  if (opciones[idx]) opciones[idx].classList.add('votado');
}

// ══════════════════════════════════════════════
//  RENDER: PARTIDOS
// ══════════════════════════════════════════════
function renderPartidos() {
  const contenedor = document.getElementById('lista-partidos');
  if (!contenedor) return;

  contenedor.innerHTML = PARTIDOS.map(p => `
    <div class="tarjeta">
      <div class="partido-header">
        <div class="partido-logo" style="background:${p.color}">${p.sigla}</div>
        <div>
          <div class="partido-nombre">${p.nombre}</div>
          <div class="partido-sigla">Partido político</div>
        </div>
      </div>
      <ul class="propuestas-lista">
        ${p.propuestas.map(prop => `<li>${prop}</li>`).join('')}
      </ul>
    </div>`
  ).join('');
}

// ══════════════════════════════════════════════
//  RENDER: CANDIDATOS
// ══════════════════════════════════════════════
function poblarFiltros() {
  const sel = document.getElementById('filtro-partido-cand');
  if (!sel || sel.options.length > 1) return;
  PARTIDOS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nombre;
    sel.appendChild(opt);
  });
}

function renderCandidatos() {
  const filtroPartido = document.getElementById('filtro-partido-cand')?.value || '';
  const busqueda = (document.getElementById('buscar-candidato')?.value || '').toLowerCase();
  const contenedor = document.getElementById('lista-candidatos-full');
  if (!contenedor) return;

  let lista = CANDIDATOS;
  if (filtroPartido) lista = lista.filter(c => c.partido === filtroPartido);
  if (busqueda) lista = lista.filter(c => c.nombre.toLowerCase().includes(busqueda));

  if (lista.length === 0) {
    contenedor.innerHTML = '<p style="color:var(--gris);font-size:0.9rem">No se encontraron candidatos.</p>';
    return;
  }

  contenedor.innerHTML = lista.map(c => {
    const partido = PARTIDOS.find(p => p.id === c.partido);
    const iniciales = c.nombre.split(' ').slice(0, 2).map(n => n[0]).join('');

    return `
      <div class="candidato-card">
        <div class="candidato-avatar" style="background:${partido.color}">${iniciales}</div>
        <h3>${c.nombre}</h3>
        <span class="partido-tag" style="background:${partido.color}">${partido.nombre}</span>
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
            <div class="dato-valor" style="font-size:0.8rem">${c.experiencia}</div>
          </div>
        </div>
        <div style="margin-top:8px">
          <div class="dato-label" style="margin-bottom:4px">Cargos previos</div>
          <ul style="font-size:0.8rem;color:var(--gris);line-height:1.8;padding-left:0;list-style:none">
            ${c.cargos.map(cargo => `<li>→ ${cargo}</li>`).join('')}
          </ul>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  RENDER: COMPARADOR
// ══════════════════════════════════════════════
function poblarFiltrosComp() {
  const sel = document.getElementById('filtro-partido-comp');
  if (!sel || sel.options.length > 1) return;
  PARTIDOS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nombre;
    sel.appendChild(opt);
  });
}

function renderComparador() {
  const filtroPartido = document.getElementById('filtro-partido-comp')?.value || '';
  const filtroCol = document.getElementById('filtro-columna')?.value || 'todo';
  const tbody = document.getElementById('tbody-comp');
  if (!tbody) return;

  let lista = CANDIDATOS;
  if (filtroPartido) lista = lista.filter(c => c.partido === filtroPartido);

  tbody.innerHTML = lista.map(c => {
    const partido = PARTIDOS.find(p => p.id === c.partido);
    return `
      <tr>
        <td><strong>${c.nombre}</strong></td>
        <td><span style="background:${partido.color};color:white;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:600">${partido.sigla}</span></td>
        <td>${filtroCol === 'denuncias' || filtroCol === 'experiencia' ? '—' : c.edad}</td>
        <td>${filtroCol !== 'todo' ? '—' : c.nacimiento}</td>
        <td>${filtroCol === 'edad' || filtroCol === 'experiencia' ? '—' :
          `<span class="tag-denuncias">${c.denuncias} denuncia${c.denuncias !== 1 ? 's' : ''}</span>`}</td>
        <td>${filtroCol === 'edad' || filtroCol === 'denuncias' ? '—' :
          c.cargos.slice(0, 2).join(', ')}</td>
        <td>${filtroCol === 'edad' || filtroCol === 'denuncias' ? '—' : c.experiencia}</td>
      </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  MODAL LOGIN
// ══════════════════════════════════════════════
function abrirModal() {
  document.getElementById('modal-overlay').classList.add('abierto');
}

function cerrarModal() {
  document.getElementById('modal-overlay').classList.remove('abierto');
}

function cerrarModalSiFuera(e) {
  if (e.target === document.getElementById('modal-overlay')) cerrarModal();
}

function cambiarTab(tab, btn) {
  document.querySelectorAll('.modal-tab').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');
  document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('form-registro').style.display = tab === 'registro' ? 'block' : 'none';
  document.getElementById('modal-error').style.display = 'none';
}

// Login simulado (en el siguiente paso se conecta a Supabase)
function iniciarSesion() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('modal-error');

  if (!email || !pass) {
    err.textContent = 'Completa todos los campos.';
    err.style.display = 'block';
    return;
  }

  // Simulación: cualquier correo/pass funciona por ahora
  usuarioActual = { email };
  cerrarModal();
  document.querySelector('.btn-login').textContent = email.split('@')[0];
  document.getElementById('aviso-login').style.display = 'none';
  renderEncuesta();
}

function registrarse() {
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const err = document.getElementById('modal-error');

  if (!email || !pass) {
    err.textContent = 'Completa todos los campos.';
    err.style.display = 'block';
    return;
  }
  if (pass.length < 6) {
    err.textContent = 'La contraseña debe tener mínimo 6 caracteres.';
    err.style.display = 'block';
    return;
  }

  // Simulación registro exitoso
  usuarioActual = { email };
  cerrarModal();
  document.querySelector('.btn-login').textContent = email.split('@')[0];
  document.getElementById('aviso-login').style.display = 'none';
  renderEncuesta();
}

// ══════════════════════════════════════════════
//  COMPARTIR / DESCARGAR
// ══════════════════════════════════════════════
function descargarImagen() {
  // html2canvas se integrará en el siguiente paso
  alert('La descarga de imagen estará disponible en el siguiente paso (integración html2canvas).');
}

function compartirWhatsApp() {
  const total = Object.values(votosSimulados).reduce((a, b) => a + b, 0);
  const lider = CANDIDATOS.reduce((a, b) =>
    (votosSimulados[b.id] || 0) > (votosSimulados[a.id] || 0) ? b : a
  );
  const pct = Math.round(((votosSimulados[lider.id] || 0) / total) * 100);
  const texto = encodeURIComponent(
    `📊 Encuesta Electoral Perú 2026\n` +
    `Líder: ${lider.nombre} con ${pct}%\n` +
    `Total: ${total.toLocaleString()} votos\n` +
    `Vota tú también 👉 ${window.location.href}`
  );
  window.open(`https://wa.me/?text=${texto}`, '_blank');
}

function copiarEnlace() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert('Enlace copiado al portapapeles.');
  });
}

// ══════════════════════════════════════════════
//  SOPORTE (simulado — EmailJS va en paso 4)
// ══════════════════════════════════════════════
function enviarSoporte() {
  const nombre = document.getElementById('soporte-nombre').value.trim();
  const email = document.getElementById('soporte-email').value.trim();
  const mensaje = document.getElementById('soporte-mensaje').value.trim();

  if (!nombre || !email || !mensaje) {
    alert('Por favor completa todos los campos.');
    return;
  }

  // Simulación: en paso 4 esto se conecta a EmailJS
  document.getElementById('soporte-confirmacion').style.display = 'block';
  document.getElementById('soporte-nombre').value = '';
  document.getElementById('soporte-email').value = '';
  document.getElementById('soporte-mensaje').value = '';
}

// ══════════════════════════════════════════════
//  INICIO
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  renderEncuesta();
});
