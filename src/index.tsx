import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

// ─── Template Library ────────────────────────────────────────────────
const templates = [
  {
    key: 'glucose-intelligence',
    name: '혈당 인텔리전스 허브',
    nameEn: 'Glucose Intelligence Hub',
    desc: 'CGM 데이터 기반 실시간 혈당 분석 및 개인화 인사이트 플랫폼',
    category: '당뇨병 관리',
    screens: [
      { name: '대시보드', desc: '실시간 혈당 모니터링, TIR 게이지, 일간/주간 트렌드 차트' },
      { name: '패턴 분석', desc: 'AGP 리포트, 식후 스파이크 감지, 저혈당 위험 알림' },
      { name: '식사 기록', desc: '사진 기반 식사 로깅, 탄수화물 추정, 혈당 영향 상관분석' },
      { name: '인사이트 피드', desc: 'AI 생성 일일 요약, 행동 권장사항, 주간 리포트' },
      { name: '설정', desc: '목표 범위 설정, 알림 임계값, CGM 기기 연동' },
    ],
    entities: ['GlucoseReading', 'MealLog', 'InsulinDose', 'ActivitySession', 'DailyReport'],
    aiFeatures: ['혈당 패턴 예측', '식후 스파이크 사전 경고', '인슐린 용량 최적화 제안'],
  },
  {
    key: 'clinical-trial-orchestrator',
    name: '임상시험 오케스트레이터',
    nameEn: 'Clinical Trial Orchestrator',
    desc: '임상시험 운영 전 과정을 디지털화하는 통합 관리 플랫폼',
    category: '임상연구',
    screens: [
      { name: '시험 현황판', desc: '등록 진행률, 사이트별 현황, 마일스톤 타임라인' },
      { name: '피험자 관리', desc: '스크리닝 워크플로, 적격성 체크리스트, 동의서 관리' },
      { name: '데이터 수집', desc: 'eCRF 폼 빌더, 쿼리 관리, 데이터 검증 규칙' },
      { name: '안전성 보고', desc: 'AE/SAE 보고, 인과관계 평가, 규제 보고서 자동 생성' },
      { name: '분석 대시보드', desc: '중간분석 시각화, 안전성 시그널, 통계 보고서' },
    ],
    entities: ['Trial', 'Site', 'Subject', 'Visit', 'AdverseEvent', 'CRFEntry'],
    aiFeatures: ['적격성 자동 판정', '프로토콜 위반 감지', '안전성 시그널 조기 탐지'],
  },
  {
    key: 'metabolic-coach',
    name: '대사 라이프스타일 코치',
    nameEn: 'Metabolic Lifestyle Coach',
    desc: '대사 건강 지표 기반 개인화 생활습관 코칭 플랫폼',
    category: '건강관리',
    screens: [
      { name: '건강 스코어', desc: '종합 대사 점수, 체성분, 혈압, 혈당, 지질 트렌드' },
      { name: '식단 플래너', desc: 'AI 식단 추천, 영양소 분석, 칼로리 트래킹' },
      { name: '운동 가이드', desc: '맞춤 운동 프로그램, 심박수 기반 강도 조절, 운동 기록' },
      { name: '수면 분석', desc: '수면 패턴, 회복 점수, 일주기 리듬 최적화 팁' },
      { name: '코치 채팅', desc: 'AI 코치와 실시간 상담, 목표 설정, 동기 부여 메시지' },
    ],
    entities: ['UserProfile', 'HealthMetric', 'MealPlan', 'Exercise', 'SleepRecord', 'CoachMessage'],
    aiFeatures: ['개인화 식단 생성', '운동 강도 최적화', '수면 패턴 개선 권장'],
  },
]

// ─── Evidence AI Responses ───────────────────────────────────────────
interface EvidenceCitation {
  title: string
  journal: string
  year: number
  doi: string
  relevance: string
}

interface EvidenceResponse {
  answer: string
  citations: EvidenceCitation[]
  confidence: 'high' | 'moderate' | 'limited'
  relatedQuestions: string[]
}

const evidenceDB: Record<string, EvidenceResponse> = {
  diabetes: {
    answer:
      '<strong>제2형 당뇨병 약물치료</strong>는 생활습관 교정과 함께 시작됩니다. ' +
      '<strong>Metformin</strong>은 여전히 1차 약제로 권고되며, HbA1c 목표에 도달하지 못하면 ' +
      '<strong>SGLT2 억제제</strong>(empagliflozin, dapagliflozin)나 <strong>GLP-1 수용체 작용제</strong>' +
      '(semaglutide, liraglutide)를 추가합니다. ' +
      'SGLT2 억제제는 심부전 및 만성 신질환에서 심혈관 및 신장 보호 효과가 입증되었습니다. ' +
      'GLP-1 수용체 작용제는 체중 감소 효과와 함께 주요 심혈관 사건(MACE) 감소를 보여줍니다. ' +
      '최근 ADA 2024 가이드라인은 심혈관 질환이나 신장 질환이 있는 환자에서 HbA1c와 관계없이 ' +
      'SGLT2 억제제 또는 GLP-1 수용체 작용제의 조기 사용을 권고합니다.',
    citations: [
      { title: 'Standards of Care in Diabetes - 2024', journal: 'Diabetes Care', year: 2024, doi: '10.2337/dc24-S009', relevance: 'ADA 공식 진료 가이드라인' },
      { title: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes (EMPA-REG OUTCOME)', journal: 'N Engl J Med', year: 2015, doi: '10.1056/NEJMoa1515920', relevance: 'SGLT2 억제제 심혈관 보호 근거' },
      { title: 'Semaglutide and Cardiovascular Outcomes in Patients with Type 2 Diabetes (SUSTAIN-6)', journal: 'N Engl J Med', year: 2016, doi: '10.1056/NEJMoa1607141', relevance: 'GLP-1 RA 심혈관 보호 근거' },
      { title: 'Dapagliflozin and Cardiovascular Outcomes in Type 2 Diabetes (DECLARE-TIMI 58)', journal: 'N Engl J Med', year: 2019, doi: '10.1056/NEJMoa1812389', relevance: 'SGLT2 억제제 광범위 환자군 근거' },
      { title: 'Effect of Semaglutide on Body Weight in Overweight or Obese Adults (STEP 1)', journal: 'N Engl J Med', year: 2021, doi: '10.1056/NEJMoa2032183', relevance: 'GLP-1 RA 체중 감량 효과' },
    ],
    confidence: 'high',
    relatedQuestions: [
      'SGLT2 억제제와 GLP-1 수용체 작용제의 병용요법 근거는?',
      '심부전이 동반된 당뇨병 환자의 최적 치료 전략은?',
      'Metformin 사용이 어려운 환자의 대체 1차 약제는?',
      'GLP-1 수용체 작용제의 신장 보호 효과 근거는?',
    ],
  },
  hypertension: {
    answer:
      '<strong>고혈압 관리</strong>는 2017 ACC/AHA 가이드라인 기준 <strong>130/80 mmHg 이상</strong>을 ' +
      '고혈압으로 정의합니다. 1기 고혈압(130-139/80-89)에서는 10년 ASCVD 위험도 ≥10%인 경우 약물 치료를 시작합니다. ' +
      '<strong>1차 약제</strong>로는 thiazide계 이뇨제, ACE 억제제, ARB, calcium channel blocker 중 선택합니다. ' +
      '2기 고혈압(≥140/90)에서는 즉시 약물치료를 시작하며, 목표 혈압까지 도달하지 못하면 ' +
      '2제 또는 3제 병용요법을 사용합니다. SPRINT 연구에서 수축기 혈압 <120 mmHg의 집중 치료가 ' +
      '주요 심혈관 사건과 사망률을 유의하게 감소시켰습니다.',
    citations: [
      { title: '2017 ACC/AHA Guideline for Prevention, Detection, Evaluation, and Management of High Blood Pressure', journal: 'J Am Coll Cardiol', year: 2018, doi: '10.1016/j.jacc.2017.11.006', relevance: '미국 고혈압 가이드라인' },
      { title: 'A Randomized Trial of Intensive versus Standard Blood-Pressure Control (SPRINT)', journal: 'N Engl J Med', year: 2015, doi: '10.1056/NEJMoa1511939', relevance: '집중 혈압 조절 근거' },
      { title: 'Pharmacologic Treatment of Hypertension in Adults Aged 60 Years or Older (JNC 8)', journal: 'JAMA', year: 2014, doi: '10.1001/jama.2013.284427', relevance: '노인 고혈압 치료 근거' },
    ],
    confidence: 'high',
    relatedQuestions: [
      '저항성 고혈압의 정의와 치료 전략은?',
      '임산부 고혈압 관리 가이드라인은?',
      'ACE 억제제와 ARB의 선택 기준은?',
      '가면 고혈압의 진단 방법은?',
    ],
  },
  thyroid: {
    answer:
      '<strong>갑상선 결절 평가</strong>는 초음파 소견에 따른 체계적 접근이 필요합니다. ' +
      'ACR TI-RADS (Thyroid Imaging Reporting and Data System)를 사용하여 ' +
      '결절의 위험도를 분류합니다. <strong>TI-RADS 점수</strong>에 따라: TR1(양성) 및 TR2(의심되지 않음)는 FNA 불필요, ' +
      'TR3(경도 의심)은 ≥2.5cm에서 FNA, TR4(중등도 의심)는 ≥1.5cm에서 FNA, ' +
      'TR5(고도 의심)는 ≥1.0cm에서 FNA를 시행합니다. ' +
      'Bethesda System을 사용하여 세포학적 결과를 보고하며, ' +
      '비진단적(I)에서 악성(VI)까지 6단계로 분류합니다. ' +
      '분자 검사(Afirma, ThyroSeq)는 부정형(III) 또는 여포성 병변(IV)에서 추가 정보를 제공합니다.',
    citations: [
      { title: 'ACR Thyroid Imaging, Reporting and Data System (TI-RADS)', journal: 'J Am Coll Radiol', year: 2017, doi: '10.1016/j.jacr.2017.01.046', relevance: '갑상선 결절 초음파 분류 체계' },
      { title: '2015 American Thyroid Association Management Guidelines for Thyroid Nodules and Differentiated Thyroid Cancer', journal: 'Thyroid', year: 2016, doi: '10.1089/thy.2015.0020', relevance: 'ATA 갑상선 결절 가이드라인' },
      { title: 'The Bethesda System for Reporting Thyroid Cytopathology', journal: 'Thyroid', year: 2017, doi: '10.1089/thy.2017.0500', relevance: '세포학적 분류 체계' },
      { title: 'Molecular Testing for Thyroid Nodules: A Review', journal: 'JAMA', year: 2018, doi: '10.1001/jama.2018.0368', relevance: '분자 검사 역할 리뷰' },
    ],
    confidence: 'high',
    relatedQuestions: [
      'Bethesda III/IV 결절에서 분자 검사의 역할은?',
      '갑상선 미세유두암의 적극적 감시 기준은?',
      '갑상선 결절의 추적 초음파 간격은?',
      '방사성 요오드 치료의 적응증은?',
    ],
  },
  hba1c: {
    answer:
      '<strong>고령 당뇨병 환자의 HbA1c 목표</strong>는 개인화된 접근이 필수적입니다. ' +
      'ADA 2024 가이드라인은 다음과 같이 권고합니다: ' +
      '<strong>건강한 고령자</strong>(동반질환 적음, 인지기능 정상, 기능 독립적): HbA1c <7.0-7.5%. ' +
      '<strong>복잡/중간 건강</strong>(다수 동반질환, 경도 인지장애, 2+ IADL 의존): HbA1c <8.0%. ' +
      '<strong>매우 복잡/불량 건강</strong>(말기 질환, 중등도-중증 인지저하, 다수 ADL 의존): HbA1c <8.5%. ' +
      '과도한 혈당 관리는 저혈당 위험을 증가시키며, 특히 고령자에서 낙상, 골절, 인지기능 악화와 ' +
      '관련됩니다. 치료 단순화(deintensification)도 중요한 전략입니다.',
    citations: [
      { title: 'Older Adults: Standards of Care in Diabetes - 2024', journal: 'Diabetes Care', year: 2024, doi: '10.2337/dc24-S013', relevance: '고령자 당뇨병 관리 가이드라인' },
      { title: 'Intensive Blood Glucose Control and Vascular Outcomes in Patients with Type 2 Diabetes (ADVANCE)', journal: 'N Engl J Med', year: 2008, doi: '10.1056/NEJMoa0802987', relevance: '집중 혈당 관리의 결과' },
      { title: 'Hypoglycemia and Risk of Fall-Related Events in Older Adults', journal: 'Diabetes Care', year: 2012, doi: '10.2337/dc11-1028', relevance: '저혈당과 낙상 위험' },
      { title: 'Glycemic Targets in Older Adults with Diabetes: ADA Consensus Report', journal: 'Diabetes Care', year: 2021, doi: '10.2337/dci21-0034', relevance: '고령자 목표 혈당 합의문' },
    ],
    confidence: 'high',
    relatedQuestions: [
      '고령 당뇨병 환자에서 약물 단순화(deintensification) 전략은?',
      '인지저하가 있는 당뇨병 환자의 자가관리 지원 방법은?',
      '요양시설 거주 당뇨병 환자의 혈당 관리 목표는?',
      '고령자에서 GLP-1 수용체 작용제의 안전성은?',
    ],
  },
}

function findEvidence(question: string): EvidenceResponse {
  const q = question.toLowerCase()
  if (q.includes('당뇨') || q.includes('metformin') || q.includes('sglt2') || q.includes('glp-1') || q.includes('diabetes') || q.includes('혈당') && (q.includes('약') || q.includes('치료') || q.includes('관리'))) {
    return evidenceDB.diabetes
  }
  if (q.includes('고혈압') || q.includes('혈압') || q.includes('hypertension') || q.includes('blood pressure')) {
    return evidenceDB.hypertension
  }
  if (q.includes('갑상선') || q.includes('결절') || q.includes('thyroid') || q.includes('nodule')) {
    return evidenceDB.thyroid
  }
  if (q.includes('hba1c') || q.includes('당화혈색소') || q.includes('고령') || q.includes('elderly') || q.includes('노인')) {
    return evidenceDB.hba1c
  }
  // Default response
  return {
    answer:
      '해당 질문에 대한 <strong>임상 근거</strong>를 분석하였습니다. ' +
      '현재 데이터베이스에 최적화된 응답이 준비되어 있지 않으나, 관련 문헌을 기반으로 안내드립니다. ' +
      '최신 가이드라인과 체계적 문헌고찰을 참고하여 근거 기반 의사결정을 권장합니다. ' +
      '보다 구체적인 임상 시나리오를 제공해 주시면 더 정확한 근거를 안내드릴 수 있습니다.',
    citations: [
      { title: 'Evidence-Based Medicine: How to Practice and Teach EBM', journal: 'Elsevier', year: 2023, doi: '10.1016/C2018-0-01322-7', relevance: '근거중심의학 방법론' },
      { title: 'Users\' Guides to the Medical Literature: A Manual for Evidence-Based Clinical Practice', journal: 'JAMA Network', year: 2015, doi: '10.1001/jama.2014.16869', relevance: '임상 근거 활용 가이드' },
    ],
    confidence: 'limited',
    relatedQuestions: [
      '제2형 당뇨병의 최신 약물치료 가이드라인은?',
      '고혈압 1차 약제 선택 기준은?',
      '갑상선 결절 평가를 위한 TI-RADS 기준은?',
      '고령 당뇨병 환자의 HbA1c 목표치는?',
    ],
  }
}

// ─── Blueprint Generator ─────────────────────────────────────────────
interface BlueprintInput {
  templateKey: string
  projectName: string
  targetAudience: string
  clinicalFocus: string
  differentiator: string
  dataSources: string
  monetization: string
  aiAssistants: string
}

function generateBlueprint(input: BlueprintInput) {
  const template = templates.find((t) => t.key === input.templateKey) ?? templates[0]
  const projectName = input.projectName || template.name

  return {
    summary: {
      appName: projectName,
      tagline: `${input.clinicalFocus || template.category} 분야의 AI 기반 의료 솔루션`,
      mission: `${input.targetAudience || '의료 전문가'}를 위한 ${template.desc}`,
      template: template.name,
    },
    uiPlan: {
      screens: template.screens.map((s) => ({
        name: s.name,
        description: s.desc,
        priority: 'P0',
      })),
      designSystem: '다크/라이트 모드 지원, 의료 접근성 준수 (WCAG 2.1 AA)',
    },
    dataPlan: {
      entities: template.entities.map((e) => ({
        name: e,
        storage: 'Cloudflare D1 + R2',
        encryption: 'AES-256-GCM at rest',
      })),
      compliance: 'HIPAA / 개인정보보호법 준수, PHI 암호화 및 접근 로그',
    },
    automationPlan: {
      aiFeatures: template.aiFeatures,
      customFeatures: input.aiAssistants
        ? input.aiAssistants.split(',').map((f) => f.trim())
        : ['사용자 정의 AI 기능'],
      infrastructure: 'Cloudflare Workers AI + D1 + R2 + KV',
    },
    monetizationPlan: {
      model: input.monetization || 'Freemium + 구독형',
      tiers: [
        { name: '무료', price: '₩0', features: ['기본 모니터링', '주간 리포트 1회'] },
        { name: '프로', price: '₩29,000/월', features: ['AI 인사이트', '실시간 알림', '무제한 리포트'] },
        { name: '엔터프라이즈', price: '맞춤 견적', features: ['전용 서버', 'SLA 보장', '커스텀 인테그레이션'] },
      ],
    },
    launchChecklist: [
      { phase: 'MVP (4주)', tasks: ['핵심 화면 구현', 'DB 스키마 설계', '인증 시스템 구축'] },
      { phase: 'Beta (8주)', tasks: ['AI 기능 통합', '사용자 테스트', '성능 최적화'] },
      { phase: 'Launch (12주)', tasks: ['보안 감사', '규제 검토', '앱스토어 등록'] },
    ],
    analytics: {
      kpi: ['DAU/MAU 비율', '세션 시간', '기능별 사용률', '이탈률', 'NPS'],
      tools: 'Cloudflare Analytics + Custom Events',
    },
    compliance: {
      standards: ['HIPAA', '개인정보보호법', 'GDPR (해외 사용자)'],
      measures: ['PHI 암호화', '접근 로그', '감사 추적', '데이터 최소 수집'],
    },
    experiments: [
      { name: 'AI 추천 정확도 A/B 테스트', metric: '사용자 채택률', duration: '2주' },
      { name: '알림 빈도 최적화', metric: '리텐션율', duration: '4주' },
      { name: '온보딩 플로우 테스트', metric: '완료율', duration: '2주' },
    ],
    differentiator: input.differentiator || '임상 근거 기반 AI 의사결정 지원',
    dataSources: input.dataSources
      ? input.dataSources.split(',').map((d) => d.trim())
      : ['CGM', 'EMR', '웨어러블 기기', 'PGHD'],
  }
}

// ─── Routes ──────────────────────────────────────────────────────────

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// API: Templates
app.get('/api/templates', (c) => c.json(templates))

// API: Evidence AI
app.post('/api/ask', async (c) => {
  const body = await c.req.json<{ question: string }>()
  if (!body.question || body.question.trim().length === 0) {
    return c.json({ error: '질문을 입력해 주세요.' }, 400)
  }
  const result = findEvidence(body.question)
  return c.json(result)
})

// API: Blueprint Generator
app.post('/api/generate', async (c) => {
  const body = await c.req.json<BlueprintInput>()
  if (!body.templateKey) {
    return c.json({ error: '템플릿을 선택해 주세요.' }, 400)
  }
  const blueprint = generateBlueprint(body)
  return c.json(blueprint)
})

// Landing page
app.get('/', (c) => {
  return c.render(
    <div class="container">
      {/* Navigation */}
      <nav class="nav">
        <a href="/" class="nav-brand">Endo App Forge</a>
        <div class="nav-links">
          <a href="#" data-tab="evidence">Evidence AI</a>
          <a href="#" data-tab="forge">App Forge</a>
          <a href="#" data-tab="pricing">Pricing</a>
          <a href="#" class="btn btn-outline btn-sm">로그인</a>
        </div>
      </nav>

      {/* Hero */}
      <section class="hero">
        <div class="badge">Endo App Forge &mdash; Beta</div>
        <h1>
          의료 전문가를 위한
          <br />
          <span class="accent">AI 임상 근거 플랫폼</span>
        </h1>
        <p>
          임상 질문에 대한 근거 기반 답변과 의료 앱 블루프린트를 AI가 생성합니다.
          최신 가이드라인과 주요 연구를 기반으로 신뢰할 수 있는 정보를 제공합니다.
        </p>
      </section>

      {/* Tabs */}
      <div class="tabs">
        <button class="tab active" data-tab="evidence">Evidence AI</button>
        <button class="tab" data-tab="forge">App Forge</button>
        <button class="tab" data-tab="pricing">Pricing</button>
      </div>

      {/* ── Tab 1: Evidence AI ── */}
      <div id="panel-evidence" class="tab-panel active">
        <div class="section">
          <h2 class="section-title">임상 근거 AI 검색</h2>
          <p class="section-desc">
            임상 질문을 입력하면 최신 가이드라인과 주요 연구 근거를 기반으로 답변합니다.
          </p>

          <div class="ask-box">
            <input
              type="text"
              id="ask-input"
              class="ask-input"
              placeholder="임상 질문을 입력하세요... (예: 제2형 당뇨병 1차 약제 선택 기준은?)"
            />
            <button id="ask-btn" class="btn btn-primary ask-btn">검색</button>
          </div>

          <div class="quick-questions">
            <button class="quick-chip" data-question="제2형 당뇨병의 최신 약물치료 가이드라인은?">
              제2형 당뇨병 약물치료
            </button>
            <button class="quick-chip" data-question="고혈압 1차 약제 선택 기준은?">
              고혈압 치료 가이드라인
            </button>
            <button class="quick-chip" data-question="갑상선 결절 평가를 위한 TI-RADS 기준은?">
              갑상선 결절 평가
            </button>
            <button class="quick-chip" data-question="고령 당뇨병 환자의 HbA1c 목표치는?">
              고령 환자 HbA1c 목표
            </button>
          </div>

          <div id="evidence-loading" class="hidden mt-6">
            <div class="loading-bar"></div>
            <p class="text-sm text-muted">근거를 분석하고 있습니다<span class="loading-dots"></span></p>
          </div>

          <div id="evidence-results" class="mt-6"></div>
        </div>
      </div>

      {/* ── Tab 2: App Forge ── */}
      <div id="panel-forge" class="tab-panel">
        <div class="section">
          <h2 class="section-title">의료 앱 블루프린트 생성</h2>
          <p class="section-desc">
            템플릿을 선택하고 프로젝트 정보를 입력하면 AI가 완전한 앱 설계 블루프린트를 생성합니다.
          </p>

          <div class="grid-2">
            <div>
              <div class="form-group">
                <label class="form-label">템플릿 선택</label>
                <select id="template-select" class="form-select">
                  <option value="">템플릿을 선택하세요...</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">프로젝트 이름</label>
                <input type="text" id="project-name" class="form-input" placeholder="예: GlucoSense Pro" />
              </div>
              <div class="form-group">
                <label class="form-label">타겟 사용자</label>
                <input type="text" id="target-audience" class="form-input" placeholder="예: 내분비내과 전문의, 당뇨병 환자" />
              </div>
              <div class="form-group">
                <label class="form-label">임상 초점 영역</label>
                <input type="text" id="clinical-focus" class="form-input" placeholder="예: 제2형 당뇨병 관리" />
              </div>
            </div>
            <div>
              <div class="form-group">
                <label class="form-label">차별화 포인트</label>
                <textarea id="differentiator" class="form-textarea" placeholder="기존 솔루션과의 차별점을 설명하세요..."></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">데이터 소스 (쉼표 구분)</label>
                <input type="text" id="data-sources" class="form-input" placeholder="예: CGM, EMR, 웨어러블, PGHD" />
              </div>
              <div class="form-group">
                <label class="form-label">수익 모델</label>
                <input type="text" id="monetization" class="form-input" placeholder="예: Freemium + 구독형" />
              </div>
              <div class="form-group">
                <label class="form-label">AI 기능 (쉼표 구분)</label>
                <input type="text" id="ai-assistants" class="form-input" placeholder="예: 혈당 예측, 식단 추천, 복약 알림" />
              </div>
            </div>
          </div>

          <div class="mt-4">
            <button id="generate-btn" class="btn btn-primary w-full">블루프린트 생성</button>
          </div>

          <div id="forge-loading" class="hidden mt-6">
            <div class="loading-bar"></div>
            <p class="text-sm text-muted">블루프린트를 생성하고 있습니다<span class="loading-dots"></span></p>
          </div>

          <div id="forge-results" class="mt-6"></div>
        </div>
      </div>

      {/* ── Tab 3: Pricing ── */}
      <div id="panel-pricing" class="tab-panel">
        <div class="section text-center">
          <h2 class="section-title">요금제</h2>
          <p class="section-desc">프로젝트 규모에 맞는 플랜을 선택하세요.</p>

          <div class="grid-3">
            <div class="pricing-card">
              <h3>Starter</h3>
              <div class="pricing-price">$39</div>
              <div class="pricing-period">/ 월</div>
              <ul class="pricing-features">
                <li>Evidence AI 월 50회 질의</li>
                <li>앱 블루프린트 월 3회 생성</li>
                <li>기본 템플릿 라이브러리</li>
                <li>이메일 지원</li>
              </ul>
              <button class="btn btn-outline w-full">시작하기</button>
            </div>

            <div class="pricing-card featured">
              <div class="badge mb-4">인기</div>
              <h3>Pro</h3>
              <div class="pricing-price">$99</div>
              <div class="pricing-period">/ 월</div>
              <ul class="pricing-features">
                <li>Evidence AI 무제한 질의</li>
                <li>앱 블루프린트 무제한 생성</li>
                <li>프리미엄 템플릿 라이브러리</li>
                <li>코드 생성 (React Native)</li>
                <li>우선 지원</li>
              </ul>
              <button class="btn btn-primary w-full">Pro 시작</button>
            </div>

            <div class="pricing-card">
              <h3>Enterprise</h3>
              <div class="pricing-price">맞춤</div>
              <div class="pricing-period">견적 문의</div>
              <ul class="pricing-features">
                <li>모든 Pro 기능 포함</li>
                <li>전용 인프라</li>
                <li>HIPAA 규정 준수 보장</li>
                <li>SSO/SAML 인증</li>
                <li>SLA 보장 &amp; 전담 매니저</li>
              </ul>
              <button class="btn btn-outline w-full">문의하기</button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer class="footer">
        <div>&copy; 2025 Endo App Forge. All rights reserved.</div>
        <div class="footer-links">
          <a href="#">이용약관</a>
          <a href="#">개인정보처리방침</a>
          <a href="#">문의하기</a>
        </div>
      </footer>
    </div>,
    { title: 'Endo App Forge - AI 임상 근거 플랫폼' }
  )
})

export default app
