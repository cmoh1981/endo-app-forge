// ─── Endo App Forge - Client-side Application ──────────────────────
(function () {
  'use strict';

  // ── State ──
  let templates = [];
  let authToken = localStorage.getItem('auth_token');
  let currentUser = null;

  // ── DOM References ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initEvidenceAI();
    initAppForge();
    initAuth();
    fetchTemplates();
  });

  // ─── Tab Switching ─────────────────────────────────────────────────
  function initTabs() {
    // Tab buttons
    $$('.tab').forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    // Nav links with data-tab
    $$('.nav-links a[data-tab]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.dataset.tab);
      });
    });
  }

  function switchTab(tabId) {
    // Update tab buttons
    $$('.tab').forEach((t) => t.classList.remove('active'));
    const activeTab = $(`.tab[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Update panels
    $$('.tab-panel').forEach((p) => p.classList.remove('active'));
    const panel = $(`#panel-${tabId}`);
    if (panel) panel.classList.add('active');
  }

  // ─── Evidence AI ───────────────────────────────────────────────────
  function initEvidenceAI() {
    const askInput = $('#ask-input');
    const askBtn = $('#ask-btn');

    if (!askInput || !askBtn) return;

    askBtn.addEventListener('click', () => submitQuestion());
    askInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitQuestion();
    });

    // Quick question chips
    $$('.quick-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        askInput.value = chip.dataset.question;
        submitQuestion();
      });
    });
  }

  async function submitQuestion() {
    const input = $('#ask-input');
    const question = input.value.trim();
    if (!question) return;

    const loading = $('#evidence-loading');
    const results = $('#evidence-results');
    const askBtn = $('#ask-btn');

    // Show loading
    loading.classList.remove('hidden');
    results.innerHTML = '';
    askBtn.disabled = true;
    askBtn.innerHTML = '<span class="spinner"></span>';

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '요청 처리 중 오류가 발생했습니다.');
      }

      const data = await res.json();
      renderEvidenceResult(data, question);
    } catch (err) {
      results.innerHTML = `
        <div class="evidence-card">
          <p style="color: var(--danger);">오류: ${escapeHtml(err.message)}</p>
        </div>
      `;
    } finally {
      loading.classList.add('hidden');
      askBtn.disabled = false;
      askBtn.textContent = '검색';
    }
  }

  function renderEvidenceResult(data, question) {
    const results = $('#evidence-results');

    const confidenceClass =
      data.confidence === 'high' ? 'confidence-high' :
      data.confidence === 'moderate' ? 'confidence-moderate' : 'confidence-limited';

    const confidenceLabel =
      data.confidence === 'high' ? '높은 근거 수준' :
      data.confidence === 'moderate' ? '중간 근거 수준' : '제한적 근거';

    const citationsHtml = data.citations.map((c, i) => `
      <div class="citation-chip" title="${escapeHtml(c.relevance)}">
        <span style="color: var(--blue); font-weight: 600;">[${i + 1}]</span>
        ${escapeHtml(c.title.length > 60 ? c.title.slice(0, 57) + '...' : c.title)}
        <span class="text-muted">(${c.year})</span>
      </div>
    `).join('');

    const relatedHtml = data.relatedQuestions.map((q) => `
      <button class="related-q" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button>
    `).join('');

    results.innerHTML = `
      <div class="evidence-card">
        <div class="flex items-center gap-2" style="gap: 0.75rem; margin-bottom: 0.5rem;">
          <span class="source">Evidence AI</span>
          <span class="${confidenceClass} confidence-badge">${confidenceLabel}</span>
        </div>
        <div class="evidence-answer">${data.answer}</div>
        <div class="citation-list">
          ${citationsHtml}
        </div>
      </div>

      <div class="evidence-card" style="background: transparent; border: none; padding: 0;">
        <h4 style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.75rem;">
          참고 문헌
        </h4>
        ${data.citations.map((c, i) => `
          <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.8rem;">
            <span style="color: var(--blue); font-weight: 600;">[${i + 1}]</span>
            <span style="color: var(--text);">${escapeHtml(c.title)}</span>
            <br/>
            <span class="text-muted">${escapeHtml(c.journal)}, ${c.year}</span>
            ${c.doi ? ` &middot; <a href="https://doi.org/${escapeHtml(c.doi)}" target="_blank" rel="noopener" style="color: var(--blue); font-size: 0.75rem;">DOI</a>` : ''}
            <br/>
            <span class="text-xs text-muted">${escapeHtml(c.relevance)}</span>
          </div>
        `).join('')}
      </div>

      ${data.relatedQuestions.length > 0 ? `
        <div class="related-questions">
          <h4>관련 질문</h4>
          ${relatedHtml}
        </div>
      ` : ''}
    `;

    // Bind related question clicks
    results.querySelectorAll('.related-q').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = $('#ask-input');
        input.value = btn.dataset.question;
        submitQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ─── App Forge ─────────────────────────────────────────────────────
  function initAppForge() {
    const generateBtn = $('#generate-btn');
    if (!generateBtn) return;
    generateBtn.addEventListener('click', () => submitBlueprint());
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/templates');
      templates = await res.json();
      populateTemplateDropdown();
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }

  function populateTemplateDropdown() {
    const select = $('#template-select');
    if (!select) return;
    templates.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.key;
      opt.textContent = `${t.name} (${t.nameEn})`;
      select.appendChild(opt);
    });
  }

  async function submitBlueprint() {
    const templateKey = $('#template-select')?.value;
    if (!templateKey) {
      alert('템플릿을 선택해 주세요.');
      return;
    }

    const loading = $('#forge-loading');
    const results = $('#forge-results');
    const generateBtn = $('#generate-btn');

    loading.classList.remove('hidden');
    results.innerHTML = '';
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> 생성 중...';

    const payload = {
      templateKey,
      projectName: $('#project-name')?.value || '',
      targetAudience: $('#target-audience')?.value || '',
      clinicalFocus: $('#clinical-focus')?.value || '',
      differentiator: $('#differentiator')?.value || '',
      dataSources: $('#data-sources')?.value || '',
      monetization: $('#monetization')?.value || '',
      aiAssistants: $('#ai-assistants')?.value || '',
    };

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '생성 중 오류가 발생했습니다.');
      }

      const data = await res.json();
      renderBlueprint(data);
    } catch (err) {
      results.innerHTML = `
        <div class="evidence-card">
          <p style="color: var(--danger);">오류: ${escapeHtml(err.message)}</p>
        </div>
      `;
    } finally {
      loading.classList.add('hidden');
      generateBtn.disabled = false;
      generateBtn.textContent = '블루프린트 생성';
    }
  }

  function renderBlueprint(bp) {
    const results = $('#forge-results');

    results.innerHTML = `
      <!-- Summary -->
      <div class="blueprint-section">
        <h3>📋 프로젝트 요약</h3>
        <p><strong>${escapeHtml(bp.summary.appName)}</strong></p>
        <p class="text-sm text-muted mt-1">${escapeHtml(bp.summary.tagline)}</p>
        <p class="text-sm mt-2">${escapeHtml(bp.summary.mission)}</p>
        <div class="mt-2">
          <span class="blueprint-tag">${escapeHtml(bp.summary.template)}</span>
        </div>
      </div>

      <!-- UI Plan -->
      <div class="blueprint-section">
        <h3>🖥️ UI 설계</h3>
        <p class="text-xs text-muted mb-2">${escapeHtml(bp.uiPlan.designSystem)}</p>
        ${bp.uiPlan.screens.map((s) => `
          <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
            <div class="flex items-center justify-between">
              <strong class="text-sm">${escapeHtml(s.name)}</strong>
              <span class="blueprint-tag">${s.priority}</span>
            </div>
            <p class="text-xs text-muted mt-1">${escapeHtml(s.description)}</p>
          </div>
        `).join('')}
      </div>

      <!-- Data Plan -->
      <div class="blueprint-section">
        <h3>🗄️ 데이터 모델</h3>
        <p class="text-xs text-muted mb-2">${escapeHtml(bp.dataPlan.compliance)}</p>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          ${bp.dataPlan.entities.map((e) => `
            <div class="blueprint-tag" style="padding: 0.25rem 0.75rem;">
              ${escapeHtml(e.name)} <span class="text-muted" style="margin-left: 0.25rem; font-size: 0.6rem;">${escapeHtml(e.storage)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Automation Plan -->
      <div class="blueprint-section">
        <h3>🤖 AI &amp; 자동화</h3>
        <p class="text-xs text-muted mb-2">인프라: ${escapeHtml(bp.automationPlan.infrastructure)}</p>
        <ul>
          ${bp.automationPlan.aiFeatures.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
          ${bp.automationPlan.customFeatures.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
        </ul>
      </div>

      <!-- Monetization -->
      <div class="blueprint-section">
        <h3>💰 수익 모델</h3>
        <p class="text-sm mb-2">모델: ${escapeHtml(bp.monetizationPlan.model)}</p>
        <div class="grid-3">
          ${bp.monetizationPlan.tiers.map((t) => `
            <div class="card" style="text-align: center;">
              <h3>${escapeHtml(t.name)}</h3>
              <div style="font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0;">${escapeHtml(t.price)}</div>
              <ul style="list-style: none; padding: 0;">
                ${t.features.map((f) => `<li class="text-xs text-muted" style="padding: 0.125rem 0;">${escapeHtml(f)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Launch Checklist -->
      <div class="blueprint-section">
        <h3>🚀 런치 체크리스트</h3>
        ${bp.launchChecklist.map((phase) => `
          <div style="margin-bottom: 0.75rem;">
            <strong class="text-sm text-blue">${escapeHtml(phase.phase)}</strong>
            <ul>
              ${phase.tasks.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>

      <!-- Analytics -->
      <div class="blueprint-section">
        <h3>📊 분석 &amp; KPI</h3>
        <p class="text-xs text-muted mb-2">도구: ${escapeHtml(bp.analytics.tools)}</p>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          ${bp.analytics.kpi.map((k) => `<span class="blueprint-tag">${escapeHtml(k)}</span>`).join('')}
        </div>
      </div>

      <!-- Compliance -->
      <div class="blueprint-section">
        <h3>🔒 규제 &amp; 컴플라이언스</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
          ${bp.compliance.standards.map((s) => `<span class="blueprint-tag">${escapeHtml(s)}</span>`).join('')}
        </div>
        <ul>
          ${bp.compliance.measures.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}
        </ul>
      </div>

      <!-- Experiments -->
      <div class="blueprint-section">
        <h3>🧪 A/B 실험 계획</h3>
        ${bp.experiments.map((exp) => `
          <div style="padding: 0.375rem 0; border-bottom: 1px solid var(--border);">
            <strong class="text-sm">${escapeHtml(exp.name)}</strong>
            <div class="text-xs text-muted">측정 지표: ${escapeHtml(exp.metric)} &middot; 기간: ${escapeHtml(exp.duration)}</div>
          </div>
        `).join('')}
      </div>

      <!-- Data Sources -->
      <div class="blueprint-section">
        <h3>📡 데이터 소스</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          ${bp.dataSources.map((d) => `<span class="blueprint-tag">${escapeHtml(d)}</span>`).join('')}
        </div>
        <p class="text-sm mt-2"><strong>차별화 포인트:</strong> ${escapeHtml(bp.differentiator)}</p>
      </div>
    `;
  }

  // ─── Auth ──────────────────────────────────────────────────────────
  function initAuth() {
    const authBtn = $('#auth-btn');
    const modal = $('#auth-modal');
    const closeBtn = $('#modal-close');
    const authForm = $('#auth-form');
    const toggleBtn = $('#auth-toggle');
    const logoutBtn = $('#logout-btn');

    let isSignup = false;

    if (authBtn) authBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal) modal.classList.remove('hidden');
    });

    if (closeBtn) closeBtn.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden');
    });

    // Close on backdrop click
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    if (toggleBtn) toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignup = !isSignup;
      const titleEl = $('#auth-title');
      const submitEl = $('#auth-submit');
      if (titleEl) titleEl.textContent = isSignup ? '회원가입' : '로그인';
      if (submitEl) submitEl.textContent = isSignup ? '회원가입' : '로그인';
      if (toggleBtn) toggleBtn.textContent = isSignup ? '로그인' : '회원가입';
      // Update switch text
      const switchP = toggleBtn.closest('.auth-switch');
      if (switchP) {
        const textNode = switchP.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          textNode.textContent = isSignup ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? ';
        }
      }
    });

    if (authForm) authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#auth-email').value;
      const password = $('#auth-password').value;
      const errorEl = $('#auth-error');
      const submitBtn = $('#auth-submit');

      if (errorEl) errorEl.classList.add('hidden');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '처리 중...';
      }

      try {
        const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.');

        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('auth_token', authToken);
        updateAuthUI();
        if (modal) modal.classList.add('hidden');
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('hidden');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = isSignup ? '회원가입' : '로그인';
        }
      }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      if (authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
        }).catch(() => {});
      }
      authToken = null;
      currentUser = null;
      localStorage.removeItem('auth_token');
      updateAuthUI();
    });

    // Free signup button on About tab
    const freeSignupBtn = $('#free-signup-btn');
    if (freeSignupBtn) freeSignupBtn.addEventListener('click', () => {
      isSignup = true;
      $('#auth-title').textContent = '회원가입';
      $('#auth-submit').textContent = '회원가입';
      if ($('#auth-toggle')) $('#auth-toggle').textContent = '로그인';
      modal.classList.remove('hidden');
    });

    // Check existing session
    if (authToken) checkSession();
  }

  async function checkSession() {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        currentUser = await res.json();
        updateAuthUI();
      } else {
        authToken = null;
        localStorage.removeItem('auth_token');
        updateAuthUI();
      }
    } catch {
      updateAuthUI();
    }
  }

  function updateAuthUI() {
    const authBtn = $('#auth-btn');
    const userMenu = $('#user-menu');

    if (currentUser && authToken) {
      if (authBtn) authBtn.classList.add('hidden');
      if (userMenu) {
        userMenu.classList.remove('hidden');
        const emailEl = $('#user-email');
        if (emailEl) emailEl.textContent = currentUser.email;
      }
    } else {
      if (authBtn) authBtn.classList.remove('hidden');
      if (userMenu) userMenu.classList.add('hidden');
    }
  }


  // ─── Utilities ─────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
})();
