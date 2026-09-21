// PandaÁgua — Supabase + autenticação + registros
// v0.4

const SUPABASE_URL = 'https://dpxphnxwvabjpgkrwfdb.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_QtM6KrCUx5eg7tEI9Or3NA_7X1sF3-_';

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// --------------------------------------------------
// ELEMENTOS DA PÁGINA
// --------------------------------------------------

const authView = document.getElementById('authView');
const appView = document.getElementById('appView');

const authName = document.getElementById('authName');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');

const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');

const authMessage = document.getElementById('authMessage');

const personLabel = document.getElementById('personLabel');
const totalEl = document.getElementById('total');
const pctEl = document.getElementById('pct');
const messageEl = document.getElementById('message');
const ringEl = document.getElementById('ring');

const logsEl = document.getElementById('logs');
const countEl = document.getElementById('count');

const goalEl = document.getElementById('goal');
const saveGoalBtn = document.getElementById('saveGoal');

const statusEl = document.getElementById('status');

const otherBtn = document.getElementById('other');

const editModal = document.getElementById('editModal');
const editAmount = document.getElementById('editAmount');
const editDateTime = document.getElementById('editDateTime');
const cancelEditBtn = document.getElementById('cancelEdit');
const saveEditBtn = document.getElementById('saveEdit');


// --------------------------------------------------
// ESTADO
// --------------------------------------------------

let currentUser = null;
let currentProfile = null;
let currentLogs = [];
let editingLogId = null;


// --------------------------------------------------
// MENSAGENS DE AUTENTICAÇÃO
// --------------------------------------------------

function showAuthMessage(message, type = 'error') {
  authMessage.innerHTML = '';

  if (!message) return;

  const div = document.createElement('div');
  div.className = type === 'success' ? 'success' : 'error';
  div.textContent = message;

  authMessage.appendChild(div);
}


// --------------------------------------------------
// LOGIN / CADASTRO
// --------------------------------------------------

loginBtn.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    showAuthMessage('Digite seu e-mail e sua senha.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Entrando...';

  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  loginBtn.disabled = false;
  loginBtn.textContent = '🔐 Entrar';

  if (error) {
    showAuthMessage(
      traduzirErroAuth(error)
    );
    return;
  }

  currentUser = data.user;

  await iniciarAplicativo();
});


signupBtn.addEventListener('click', async () => {
  const name = authName.value.trim();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!name) {
    showAuthMessage('Digite seu nome.');
    return;
  }

  if (!email) {
    showAuthMessage('Digite seu e-mail.');
    return;
  }

  if (password.length < 6) {
    showAuthMessage('A senha precisa ter pelo menos 6 caracteres.');
    return;
  }

  signupBtn.disabled = true;
  signupBtn.textContent = 'Criando conta...';

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name
      }
    }
  });

  signupBtn.disabled = false;
  signupBtn.textContent = '✨ Criar minha conta';

  if (error) {
    showAuthMessage(
      traduzirErroAuth(error)
    );
    return;
  }

  // Como a confirmação de e-mail está ativada,
  // normalmente não haverá sessão imediatamente.
  if (!data.session) {
    showAuthMessage(
      'Conta criada! Verifique seu e-mail e clique no link de confirmação. Depois volte ao PandaÁgua para entrar.',
      'success'
    );

    return;
  }

  currentUser = data.user;

  await iniciarAplicativo();
});


logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();

  currentUser = null;
  currentProfile = null;
  currentLogs = [];

  mostrarLogin();
});


// --------------------------------------------------
// INICIALIZAÇÃO
// --------------------------------------------------

async function inicializar() {
  statusEl.textContent = 'Verificando acesso...';

  const {
    data: {
      session
    }
  } = await sb.auth.getSession();

  if (session?.user) {
    currentUser = session.user;
    await iniciarAplicativo();
  } else {
    mostrarLogin();
  }

  sb.auth.onAuthStateChange(async (event, sessionAtual) => {
    if (sessionAtual?.user) {
      currentUser = sessionAtual.user;
    } else {
      currentUser = null;
    }
  });
}


function mostrarLogin() {
  authView.style.display = 'block';
  appView.style.display = 'none';

  statusEl.textContent = '';
}


async function iniciarAplicativo() {
  authView.style.display = 'none';
  appView.style.display = 'block';

  statusEl.textContent = 'Carregando seus dados...';

  await carregarPerfil();
  await carregarRegistros();

  statusEl.textContent = '☁️ Dados sincronizados com o PandaÁgua.';
}


// --------------------------------------------------
// PERFIL
// --------------------------------------------------

async function carregarPerfil() {
  const { data, error } = await sb
    .from('profiles')
    .select('id, display_name, daily_goal_ml')
    .eq('id', currentUser.id)
    .single();

  if (error) {
    console.error(error);

    statusEl.textContent =
      'Não foi possível carregar seu perfil.';

    return;
  }

  currentProfile = data;

  personLabel.textContent =
    currentProfile.display_name;

  goalEl.value =
    currentProfile.daily_goal_ml;
}


// --------------------------------------------------
// REGISTROS
// --------------------------------------------------

async function carregarRegistros() {
  if (!currentUser) return;

  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date();
  fim.setHours(23, 59, 59, 999);

  const { data, error } = await sb
    .from('water_logs')
    .select('id, amount_ml, consumed_at, created_at')
    .eq('user_id', currentUser.id)
    .gte('consumed_at', inicio.toISOString())
    .lte('consumed_at', fim.toISOString())
    .order('consumed_at', {
      ascending: false
    });

  if (error) {
    console.error(error);

    statusEl.textContent =
      'Erro ao carregar os registros.';

    return;
  }

  currentLogs = data || [];

  render();
}


// --------------------------------------------------
// RENDERIZAÇÃO
// --------------------------------------------------

function render() {
  const total = currentLogs.reduce(
    (sum, log) => sum + Number(log.amount_ml),
    0
  );

  const goal = Number(
    currentProfile?.daily_goal_ml || 2000
  );

  const percent = goal > 0
    ? Math.min(100, (total / goal) * 100)
    : 0;

  totalEl.textContent =
    `${total.toLocaleString('pt-BR')} ml`;

  pctEl.textContent =
    `${Math.round(percent)}%`;

  const angle = percent * 3.6;

  ringEl.style.background =
    `conic-gradient(#60a5fa ${angle}deg, #e5e7eb ${angle}deg)`;

  const remaining = Math.max(
    0,
    goal - total
  );

  if (remaining === 0) {
    messageEl.textContent =
      'Meta atingida! 🎉🐼';
  } else {
    messageEl.textContent =
      `Faltam ${remaining.toLocaleString('pt-BR')} ml para a meta 🐼`;
  }

  countEl.textContent =
    `${currentLogs.length} registro${currentLogs.length === 1 ? '' : 's'}`;

  renderLogs();
}


// --------------------------------------------------
// LISTA DE REGISTROS
// --------------------------------------------------

function renderLogs() {
  if (!currentLogs.length) {
    logsEl.innerHTML =
      '<span class="muted">Nenhum registro ainda.</span>';

    return;
  }

  logsEl.innerHTML = '';

  currentLogs.forEach(log => {
    const row = document.createElement('div');
    row.className = 'row';

    const info = document.createElement('div');

    const date = new Date(log.consumed_at);

    const time = date.toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );

    const dateText = date.toLocaleDateString(
      'pt-BR'
    );

    info.innerHTML = `
      <strong>💧 ${Number(log.amount_ml).toLocaleString('pt-BR')} ml</strong>
      <div class="muted">
        ${time} — ${dateText}
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editButton =
      document.createElement('button');

    editButton.className =
      'btn small';

    editButton.textContent =
      '✏️ Editar';

    editButton.addEventListener(
      'click',
      () => abrirEdicao(log)
    );


    const deleteButton =
      document.createElement('button');

    deleteButton.className =
      'btn small danger';

    deleteButton.textContent =
      '🗑️ Excluir';

    deleteButton.addEventListener(
      'click',
      () => excluirRegistro(log)
    );

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    row.appendChild(info);
    row.appendChild(actions);

    logsEl.appendChild(row);
  });
}


// --------------------------------------------------
// ADICIONAR ÁGUA
// --------------------------------------------------

document
  .querySelectorAll('[data-add]')
  .forEach(button => {

    button.addEventListener(
      'click',
      async () => {

        const amount =
          Number(button.dataset.add);

        await adicionarAgua(amount);
      }
    );

  });


otherBtn.addEventListener('click', async () => {
  const valor = prompt(
    'Quantos ml você tomou?'
  );

  if (valor === null) return;

  const amount = Number(
    valor.replace(',', '.')
  );

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 5000
  ) {
    alert(
      'Digite uma quantidade válida entre 1 e 5000 ml.'
    );

    return;
  }

  await adicionarAgua(
    Math.round(amount)
  );
});


async function adicionarAgua(amount) {
  if (!currentUser) return;

  const { error } = await sb
    .from('water_logs')
    .insert({
      user_id: currentUser.id,
      amount_ml: amount,
      consumed_at: new Date().toISOString()
    });

  if (error) {
    console.error(error);

    alert(
      'Não foi possível salvar o registro.'
    );

    return;
  }

  await carregarRegistros();
}


// --------------------------------------------------
// EDITAR REGISTRO
// --------------------------------------------------

function abrirEdicao(log) {
  editingLogId = log.id;

  editAmount.value =
    Number(log.amount_ml);

  editDateTime.value =
    paraDateTimeLocal(
      new Date(log.consumed_at)
    );

  editModal.style.display = 'flex';
}


cancelEditBtn.addEventListener(
  'click',
  fecharEdicao
);


editModal.addEventListener(
  'click',
  event => {

    if (event.target === editModal) {
      fecharEdicao();
    }

  }
);


function fecharEdicao() {
  editingLogId = null;
  editModal.style.display = 'none';
}


saveEditBtn.addEventListener(
  'click',
  async () => {

    if (!editingLogId) return;

    const amount =
      Number(editAmount.value);

    const dateValue =
      editDateTime.value;

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 5000
    ) {
      alert(
        'Digite uma quantidade entre 1 e 5000 ml.'
      );

      return;
    }

    if (!dateValue) {
      alert(
        'Informe a data e o horário.'
      );

      return;
    }

    const consumedAt =
      new Date(dateValue);

    if (Number.isNaN(consumedAt.getTime())) {
      alert(
        'A data ou horário informado é inválido.'
      );

      return;
    }

    saveEditBtn.disabled = true;
    saveEditBtn.textContent =
      'Salvando...';

    const { error } = await sb
      .from('water_logs')
      .update({
        amount_ml: Math.round(amount),
        consumed_at: consumedAt.toISOString()
      })
      .eq('id', editingLogId)
      .eq('user_id', currentUser.id);

    saveEditBtn.disabled = false;
    saveEditBtn.textContent =
      'Salvar alterações';

    if (error) {
      console.error(error);

      alert(
        'Não foi possível alterar o registro.'
      );

      return;
    }

    fecharEdicao();

    await carregarRegistros();
  }
);


// --------------------------------------------------
// EXCLUIR REGISTRO
// --------------------------------------------------

async function excluirRegistro(log) {

  const quantidade =
    Number(log.amount_ml).toLocaleString('pt-BR');

  const horario =
    new Date(
      log.consumed_at
    ).toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );

  const confirmar =
    confirm(
      `Excluir o registro de ${quantidade} ml às ${horario}?`
    );

  if (!confirmar) return;

  const { error } = await sb
    .from('water_logs')
    .delete()
    .eq('id', log.id)
    .eq('user_id', currentUser.id);

  if (error) {
    console.error(error);

    alert(
      'Não foi possível excluir o registro.'
    );

    return;
  }

  await carregarRegistros();
}


// --------------------------------------------------
// META
// --------------------------------------------------

saveGoalBtn.addEventListener(
  'click',
  async () => {

    if (!currentUser) return;

    const goal =
      Number(goalEl.value);

    if (
      !Number.isFinite(goal) ||
      goal < 500 ||
      goal > 10000
    ) {
      alert(
        'A meta deve estar entre 500 e 10.000 ml.'
      );

      return;
    }

    saveGoalBtn.disabled = true;
    saveGoalBtn.textContent =
      'Salvando...';

    const { error } = await sb
      .from('profiles')
      .update({
        daily_goal_ml: Math.round(goal)
      })
      .eq('id', currentUser.id);

    saveGoalBtn.disabled = false;
    saveGoalBtn.textContent =
      'Salvar meta';

    if (error) {
      console.error(error);

      alert(
        'Não foi possível salvar a meta.'
      );

      return;
    }

    currentProfile.daily_goal_ml =
      Math.round(goal);

    render();

    statusEl.textContent =
      '🎯 Meta atualizada com sucesso.';
  }
);


// --------------------------------------------------
// DATETIME LOCAL
// --------------------------------------------------

function paraDateTimeLocal(date) {

  const ano =
    date.getFullYear();

  const mes =
    String(date.getMonth() + 1)
      .padStart(2, '0');

  const dia =
    String(date.getDate())
      .padStart(2, '0');

  const hora =
    String(date.getHours())
      .padStart(2, '0');

  const minuto =
    String(date.getMinutes())
      .padStart(2, '0');

  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}


// --------------------------------------------------
// ERROS DE AUTENTICAÇÃO
// --------------------------------------------------

function traduzirErroAuth(error) {

  const mensagem =
    (error?.message || '').toLowerCase();

  if (
    mensagem.includes('invalid login credentials')
  ) {
    return 'E-mail ou senha incorretos.';
  }

  if (
    mensagem.includes('email not confirmed')
  ) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
  }

  if (
    mensagem.includes('user already registered')
  ) {
    return 'Esse e-mail já possui uma conta. Tente entrar.';
  }

  if (
    mensagem.includes('password should be at least')
  ) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }

  return error?.message ||
    'Não foi possível concluir a operação.';
}


// --------------------------------------------------
// INICIAR
// --------------------------------------------------

inicializar();
