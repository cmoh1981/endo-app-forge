import { Hono } from 'hono'
import { renderer } from './renderer'
import type { Context } from 'hono'

// ─── Type Bindings ──────────────────────────────────────────────────
type Bindings = {
  USERS: KVNamespace
  SESSIONS: KVNamespace
  GEMINI_API_KEY: string
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)

// ─── Crypto Helpers (Web Crypto API) ────────────────────────────────

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const saltB64 = arrayBufferToBase64Url(salt.buffer)
  const hashB64 = arrayBufferToBase64Url(derived)
  return `${saltB64}.${hashB64}`
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltB64, hashB64] = storedHash.split('.')
  if (!saltB64 || !hashB64) return false
  const salt = base64UrlToArrayBuffer(saltB64)
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const computedB64 = arrayBufferToBase64Url(derived)
  return computedB64 === hashB64
}

async function createToken(userId: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const payload = { userId, iat: Date.now() }
  const payloadB64 = arrayBufferToBase64Url(enc.encode(JSON.stringify(payload)).buffer)
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64))
  const sigB64 = arrayBufferToBase64Url(signature)
  return `${payloadB64}.${sigB64}`
}

async function verifyToken(token: string, secret: string): Promise<{ userId: string } | null> {
  try {
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return null
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBuffer = base64UrlToArrayBuffer(sigB64)
    const valid = await crypto.subtle.verify('HMAC', key, sigBuffer, enc.encode(payloadB64))
    if (!valid) return null
    const dec = new TextDecoder()
    const payloadJson = dec.decode(base64UrlToArrayBuffer(payloadB64))
    const payload = JSON.parse(payloadJson)
    return { userId: payload.userId }
  } catch {
    return null
  }
}

// ─── Auth Middleware ─────────────────────────────────────────────────

interface SessionData {
  userId: string
  email: string
}

interface UserData {
  id: string
  email: string
  passwordHash: string
  createdAt: string
}

async function getUser(c: Context<{ Bindings: Bindings }>): Promise<SessionData | null> {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const session = await c.env.SESSIONS.get(`session:${token}`, 'json')
  return session as SessionData | null
}

// ─── Template Library ───────────────────────────────────────────────
const templates = [
  {
    key: 'glucose-intelligence',
    name: '\uD608\uB2F9 \uC778\uD154\uB9AC\uC804\uC2A4 \uD5C8\uBE0C',
    nameEn: 'Glucose Intelligence Hub',
    desc: 'CGM \uB370\uC774\uD130 \uAE30\uBC18 \uC2E4\uC2DC\uAC04 \uD608\uB2F9 \uBD84\uC11D \uBC0F \uAC1C\uC778\uD654 \uC778\uC0AC\uC774\uD2B8 \uD50C\uB7AB\uD3FC',
    category: '\uB2F9\uB1E8\uBCD1 \uAD00\uB9AC',
    screens: [
      { name: '\uB300\uC2DC\uBCF4\uB4DC', desc: '\uC2E4\uC2DC\uAC04 \uD608\uB2F9 \uBAA8\uB2C8\uD130\uB9C1, TIR \uAC8C\uC774\uC9C0, \uC77C\uAC04/\uC8FC\uAC04 \uD2B8\uB80C\uB4DC \uCC28\uD2B8' },
      { name: '\uD328\uD134 \uBD84\uC11D', desc: 'AGP \uB9AC\uD3EC\uD2B8, \uC2DD\uD6C4 \uC2A4\uD30C\uC774\uD06C \uAC10\uC9C0, \uC800\uD608\uB2F9 \uC704\uD5D8 \uC54C\uB9BC' },
      { name: '\uC2DD\uC0AC \uAE30\uB85D', desc: '\uC0AC\uC9C4 \uAE30\uBC18 \uC2DD\uC0AC \uB85C\uAE45, \uD0C4\uC218\uD654\uBB3C \uCD94\uC815, \uD608\uB2F9 \uC601\uD5A5 \uC0C1\uAD00\uBD84\uC11D' },
      { name: '\uC778\uC0AC\uC774\uD2B8 \uD53C\uB4DC', desc: 'AI \uC0DD\uC131 \uC77C\uC77C \uC694\uC57D, \uD589\uB3D9 \uAD8C\uC7A5\uC0AC\uD56D, \uC8FC\uAC04 \uB9AC\uD3EC\uD2B8' },
      { name: '\uC124\uC815', desc: '\uBAA9\uD45C \uBC94\uC704 \uC124\uC815, \uC54C\uB9BC \uC784\uACC4\uAC12, CGM \uAE30\uAE30 \uC5F0\uB3D9' },
    ],
    entities: ['GlucoseReading', 'MealLog', 'InsulinDose', 'ActivitySession', 'DailyReport'],
    aiFeatures: ['\uD608\uB2F9 \uD328\uD134 \uC608\uCE21', '\uC2DD\uD6C4 \uC2A4\uD30C\uC774\uD06C \uC0AC\uC804 \uACBD\uACE0', '\uC778\uC290\uB9B0 \uC6A9\uB7C9 \uCD5C\uC801\uD654 \uC81C\uC548'],
  },
  {
    key: 'clinical-trial-orchestrator',
    name: '\uC784\uC0C1\uC2DC\uD5D8 \uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uD130',
    nameEn: 'Clinical Trial Orchestrator',
    desc: '\uC784\uC0C1\uC2DC\uD5D8 \uC6B4\uC601 \uC804 \uACFC\uC815\uC744 \uB514\uC9C0\uD138\uD654\uD558\uB294 \uD1B5\uD569 \uAD00\uB9AC \uD50C\uB7AB\uD3FC',
    category: '\uC784\uC0C1\uC5F0\uAD6C',
    screens: [
      { name: '\uC2DC\uD5D8 \uD604\uD669\uD310', desc: '\uB4F1\uB85D \uC9C4\uD589\uB960, \uC0AC\uC774\uD2B8\uBCC4 \uD604\uD669, \uB9C8\uC77C\uC2A4\uD1A4 \uD0C0\uC784\uB77C\uC778' },
      { name: '\uD53C\uD5D8\uC790 \uAD00\uB9AC', desc: '\uC2A4\uD06C\uB9AC\uB2DD \uC6CC\uD06C\uD50C\uB85C, \uC801\uACA9\uC131 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8, \uB3D9\uC758\uC11C \uAD00\uB9AC' },
      { name: '\uB370\uC774\uD130 \uC218\uC9D1', desc: 'eCRF \uD3FC \uBE4C\uB354, \uCFFC\uB9AC \uAD00\uB9AC, \uB370\uC774\uD130 \uAC80\uC99D \uADDC\uCE59' },
      { name: '\uC548\uC804\uC131 \uBCF4\uACE0', desc: 'AE/SAE \uBCF4\uACE0, \uC778\uACFC\uAD00\uACC4 \uD3C9\uAC00, \uADDC\uC81C \uBCF4\uACE0\uC11C \uC790\uB3D9 \uC0DD\uC131' },
      { name: '\uBD84\uC11D \uB300\uC2DC\uBCF4\uB4DC', desc: '\uC911\uAC04\uBD84\uC11D \uC2DC\uAC01\uD654, \uC548\uC804\uC131 \uC2DC\uADF8\uB110, \uD1B5\uACC4 \uBCF4\uACE0\uC11C' },
    ],
    entities: ['Trial', 'Site', 'Subject', 'Visit', 'AdverseEvent', 'CRFEntry'],
    aiFeatures: ['\uC801\uACA9\uC131 \uC790\uB3D9 \uD310\uC815', '\uD504\uB85C\uD1A0\uCF5C \uC704\uBC18 \uAC10\uC9C0', '\uC548\uC804\uC131 \uC2DC\uADF8\uB110 \uC870\uAE30 \uD0D0\uC9C0'],
  },
  {
    key: 'metabolic-coach',
    name: '\uB300\uC0AC \uB77C\uC774\uD504\uC2A4\uD0C0\uC77C \uCF54\uCE58',
    nameEn: 'Metabolic Lifestyle Coach',
    desc: '\uB300\uC0AC \uAC74\uAC15 \uC9C0\uD45C \uAE30\uBC18 \uAC1C\uC778\uD654 \uC0DD\uD65C\uC2B5\uAD00 \uCF54\uCE6D \uD50C\uB7AB\uD3FC',
    category: '\uAC74\uAC15\uAD00\uB9AC',
    screens: [
      { name: '\uAC74\uAC15 \uC2A4\uCF54\uC5B4', desc: '\uC885\uD569 \uB300\uC0AC \uC810\uC218, \uCCB4\uC131\uBD84, \uD608\uC555, \uD608\uB2F9, \uC9C0\uC9C8 \uD2B8\uB80C\uB4DC' },
      { name: '\uC2DD\uB2E8 \uD50C\uB798\uB108', desc: 'AI \uC2DD\uB2E8 \uCD94\uCC9C, \uC601\uC591\uC18C \uBD84\uC11D, \uCE7C\uB85C\uB9AC \uD2B8\uB798\uD0B9' },
      { name: '\uC6B4\uB3D9 \uAC00\uC774\uB4DC', desc: '\uB9DE\uCDA4 \uC6B4\uB3D9 \uD504\uB85C\uADF8\uB7A8, \uC2EC\uBC15\uC218 \uAE30\uBC18 \uAC15\uB3C4 \uC870\uC808, \uC6B4\uB3D9 \uAE30\uB85D' },
      { name: '\uC218\uBA74 \uBD84\uC11D', desc: '\uC218\uBA74 \uD328\uD134, \uD68C\uBCF5 \uC810\uC218, \uC77C\uC8FC\uAE30 \uB9AC\uB4EC \uCD5C\uC801\uD654 \uD301' },
      { name: '\uCF54\uCE58 \uCC44\uD305', desc: 'AI \uCF54\uCE58\uC640 \uC2E4\uC2DC\uAC04 \uC0C1\uB2F4, \uBAA9\uD45C \uC124\uC815, \uB3D9\uAE30 \uBD80\uC5EC \uBA54\uC2DC\uC9C0' },
    ],
    entities: ['UserProfile', 'HealthMetric', 'MealPlan', 'Exercise', 'SleepRecord', 'CoachMessage'],
    aiFeatures: ['\uAC1C\uC778\uD654 \uC2DD\uB2E8 \uC0DD\uC131', '\uC6B4\uB3D9 \uAC15\uB3C4 \uCD5C\uC801\uD654', '\uC218\uBA74 \uD328\uD134 \uAC1C\uC120 \uAD8C\uC7A5'],
  },
]

// ─── Evidence AI Responses ──────────────────────────────────────────
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
      '<strong>\uC81C2\uD615 \uB2F9\uB1E8\uBCD1 \uC57D\uBB3C\uCE58\uB8CC</strong>\uB294 \uC0DD\uD65C\uC2B5\uAD00 \uAD50\uC815\uACFC \uD568\uAED8 \uC2DC\uC791\uB429\uB2C8\uB2E4. ' +
      '<strong>Metformin</strong>\uC740 \uC5EC\uC804\uD788 1\uCC28 \uC57D\uC81C\uB85C \uAD8C\uACE0\uB418\uBA70, HbA1c \uBAA9\uD45C\uC5D0 \uB3C4\uB2EC\uD558\uC9C0 \uBABB\uD558\uBA74 ' +
      '<strong>SGLT2 \uC5B5\uC81C\uC81C</strong>(empagliflozin, dapagliflozin)\uB098 <strong>GLP-1 \uC218\uC6A9\uCCB4 \uC791\uC6A9\uC81C</strong>' +
      '(semaglutide, liraglutide)\uB97C \uCD94\uAC00\uD569\uB2C8\uB2E4. ' +
      'SGLT2 \uC5B5\uC81C\uC81C\uB294 \uC2EC\uBD80\uC804 \uBC0F \uB9CC\uC131 \uC2E0\uC9C8\uD658\uC5D0\uC11C \uC2EC\uD608\uAD00 \uBC0F \uC2E0\uC7A5 \uBCF4\uD638 \uD6A8\uACFC\uAC00 \uC785\uC99D\uB418\uC5C8\uC2B5\uB2C8\uB2E4. ' +
      'GLP-1 \uC218\uC6A9\uCCB4 \uC791\uC6A9\uC81C\uB294 \uCCB4\uC911 \uAC10\uC18C \uD6A8\uACFC\uC640 \uD568\uAED8 \uC8FC\uC694 \uC2EC\uD608\uAD00 \uC0AC\uAC74(MACE) \uAC10\uC18C\uB97C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4. ' +
      '\uCD5C\uADFC ADA 2024 \uAC00\uC774\uB4DC\uB77C\uC778\uC740 \uC2EC\uD608\uAD00 \uC9C8\uD658\uC774\uB098 \uC2E0\uC7A5 \uC9C8\uD658\uC774 \uC788\uB294 \uD658\uC790\uC5D0\uC11C HbA1c\uC640 \uAD00\uACC4\uC5C6\uC774 ' +
      'SGLT2 \uC5B5\uC81C\uC81C \uB610\uB294 GLP-1 \uC218\uC6A9\uCCB4 \uC791\uC6A9\uC81C\uC758 \uC870\uAE30 \uC0AC\uC6A9\uC744 \uAD8C\uACE0\uD569\uB2C8\uB2E4.',
    citations: [
      { title: 'Standards of Care in Diabetes - 2024', journal: 'Diabetes Care', year: 2024, doi: '10.2337/dc24-S009', relevance: 'ADA \uACF5\uC2DD \uC9C4\uB8CC \uAC00\uC774\uB4DC\uB77C\uC778' },
      { title: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes (EMPA-REG OUTCOME)', journal: 'N Engl J Med', year: 2015, doi: '10.1056/NEJMoa1515920', relevance: 'SGLT2 \uC5B5\uC81C\uC81C \uC2EC\uD608\uAD00 \uBCF4\uD638 \uADFC\uAC70' },
      { title: 'Semaglutide and Cardiovascular Outcomes in Patients with Type 2 Diabetes (SUSTAIN-6)', journal: 'N Engl J Med', year: 2016, doi: '10.1056/NEJMoa1607141', relevance: 'GLP-1 RA \uC2EC\uD608\uAD00 \uBCF4\uD638 \uADFC\uAC70' },
      { title: 'Dapagliflozin and Cardiovascular Outcomes in Type 2 Diabetes (DECLARE-TIMI 58)', journal: 'N Engl J Med', year: 2019, doi: '10.1056/NEJMoa1812389', relevance: 'SGLT2 \uC5B5\uC81C\uC81C \uAD11\uBC94\uC704 \uD658\uC790\uAD70 \uADFC\uAC70' },
      { title: 'Effect of Semaglutide on Body Weight in Overweight or Obese Adults (STEP 1)', journal: 'N Engl J Med', year: 2021, doi: '10.1056/NEJMoa2032183', relevance: 'GLP-1 RA \uCCB4\uC911 \uAC10\uB7C9 \uD6A8\uACFC' },
    ],
    confidence: 'high',
    relatedQuestions: [
      'SGLT2 \uC5B5\uC81C\uC81C\uC640 GLP-1 \uC218\uC6A9\uCCB4 \uC791\uC6A9\uC81C\uC758 \uBCD1\uC6A9\uC694\uBC95 \uADFC\uAC70\uB294?',
      '\uC2EC\uBD80\uC804\uC774 \uB3D9\uBC18\uB41C \uB2F9\uB1E8\uBCD1 \uD658\uC790\uC758 \uCD5C\uC801 \uCE58\uB8CC \uC804\uB7B5\uC740?',
      'Metformin \uC0AC\uC6A9\uC774 \uC5B4\uB824\uC6B4 \uD658\uC790\uC758 \uB300\uCCB4 1\uCC28 \uC57D\uC81C\uB294?',
      'GLP-1 \uC218\uC6A9\uCCB4 \uC791\uC6A9\uC81C\uC758 \uC2E0\uC7A5 \uBCF4\uD638 \uD6A8\uACFC \uADFC\uAC70\uB294?',
    ],
  },
  hypertension: {
    answer:
      '<strong>\uACE0\uD608\uC555 \uAD00\uB9AC</strong>\uB294 2017 ACC/AHA \uAC00\uC774\uB4DC\uB77C\uC778 \uAE30\uC900 <strong>130/80 mmHg \uC774\uC0C1</strong>\uC744 ' +
      '\uACE0\uD608\uC555\uC73C\uB85C \uC815\uC758\uD569\uB2C8\uB2E4. 1\uAE30 \uACE0\uD608\uC555(130-139/80-89)\uC5D0\uC11C\uB294 10\uB144 ASCVD \uC704\uD5D8\uB3C4 \u226510%\uC778 \uACBD\uC6B0 \uC57D\uBB3C \uCE58\uB8CC\uB97C \uC2DC\uC791\uD569\uB2C8\uB2E4. ' +
      '<strong>1\uCC28 \uC57D\uC81C</strong>\uB85C\uB294 thiazide\uACC4 \uC774\uB1E8\uC81C, ACE \uC5B5\uC81C\uC81C, ARB, calcium channel blocker \uC911 \uC120\uD0DD\uD569\uB2C8\uB2E4. ' +
      '2\uAE30 \uACE0\uD608\uC555(\u2265140/90)\uC5D0\uC11C\uB294 \uC989\uC2DC \uC57D\uBB3C\uCE58\uB8CC\uB97C \uC2DC\uC791\uD558\uBA70, \uBAA9\uD45C \uD608\uC555\uAE4C\uC9C0 \uB3C4\uB2EC\uD558\uC9C0 \uBABB\uD558\uBA74 ' +
      '2\uC81C \uB610\uB294 3\uC81C \uBCD1\uC6A9\uC694\uBC95\uC744 \uC0AC\uC6A9\uD569\uB2C8\uB2E4. SPRINT \uC5F0\uAD6C\uC5D0\uC11C \uC218\uCD95\uAE30 \uD608\uC555 <120 mmHg\uC758 \uC9D1\uC911 \uCE58\uB8CC\uAC00 ' +
      '\uC8FC\uC694 \uC2EC\uD608\uAD00 \uC0AC\uAC74\uACFC \uC0AC\uB9DD\uB960\uC744 \uC720\uC758\uD558\uAC8C \uAC10\uC18C\uC2DC\uCF30\uC2B5\uB2C8\uB2E4.',
    citations: [
      { title: '2017 ACC/AHA Guideline for Prevention, Detection, Evaluation, and Management of High Blood Pressure', journal: 'J Am Coll Cardiol', year: 2018, doi: '10.1016/j.jacc.2017.11.006', relevance: '\uBBF8\uAD6D \uACE0\uD608\uC555 \uAC00\uC774\uB4DC\uB77C\uC778' },
      { title: 'A Randomized Trial of Intensive versus Standard Blood-Pressure Control (SPRINT)', journal: 'N Engl J Med', year: 2015, doi: '10.1056/NEJMoa1511939', relevance: '\uC9D1\uC911 \uD608\uC555 \uC870\uC808 \uADFC\uAC70' },
      { title: 'Pharmacologic Treatment of Hypertension in Adults Aged 60 Years or Older (JNC 8)', journal: 'JAMA', year: 2014, doi: '10.1001/jama.2013.284427', relevance: '\uB178\uC778 \uACE0\uD608\uC555 \uCE58\uB8CC \uADFC\uAC70' },
    ],
    confidence: 'high',
    relatedQuestions: [
      '\uC800\uD56D\uC131 \uACE0\uD608\uC555\uC758 \uC815\uC758\uC640 \uCE58\uB8CC \uC804\uB7B5\uC740?',
      '\uC784\uC0B0\uBD80 \uACE0\uD608\uC555 \uAD00\uB9AC \uAC00\uC774\uB4DC\uB77C\uC778\uC740?',
      'ACE \uC5B5\uC81C\uC81C\uC640 ARB\uC758 \uC120\uD0DD \uAE30\uC900\uC740?',
      '\uAC00\uBA74 \uACE0\uD608\uC555\uC758 \uC9C4\uB2E8 \uBC29\uBC95\uC740?',
    ],
  },
  thyroid: {
    answer:
      '<strong>\uAC11\uC0C1\uC120 \uACB0\uC808 \uD3C9\uAC00</strong>\uB294 \uCD08\uC74C\uD30C \uC18C\uACAC\uC5D0 \uB530\uB978 \uCCB4\uACC4\uC801 \uC811\uADFC\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. ' +
      'ACR TI-RADS (Thyroid Imaging Reporting and Data System)\uB97C \uC0AC\uC6A9\uD558\uC5EC ' +
      '\uACB0\uC808\uC758 \uC704\uD5D8\uB3C4\uB97C \uBD84\uB958\uD569\uB2C8\uB2E4. <strong>TI-RADS \uC810\uC218</strong>\uC5D0 \uB530\uB77C: TR1(\uC591\uC131) \uBC0F TR2(\uC758\uC2EC\uB418\uC9C0 \uC54A\uC74C)\uB294 FNA \uBD88\uD544\uC694, ' +
      'TR3(\uACBD\uB3C4 \uC758\uC2EC)\uC740 \u22652.5cm\uC5D0\uC11C FNA, TR4(\uC911\uB4F1\uB3C4 \uC758\uC2EC)\uB294 \u22651.5cm\uC5D0\uC11C FNA, ' +
      'TR5(\uACE0\uB3C4 \uC758\uC2EC)\uB294 \u22651.0cm\uC5D0\uC11C FNA\uB97C \uC2DC\uD589\uD569\uB2C8\uB2E4. ' +
      'Bethesda System\uC744 \uC0AC\uC6A9\uD558\uC5EC \uC138\uD3EC\uD559\uC801 \uACB0\uACFC\uB97C \uBCF4\uACE0\uD558\uBA70, ' +
      '\uBE44\uC9C4\uB2E8\uC801(I)\uC5D0\uC11C \uC545\uC131(VI)\uAE4C\uC9C0 6\uB2E8\uACC4\uB85C \uBD84\uB958\uD569\uB2C8\uB2E4. ' +
      '\uBD84\uC790 \uAC80\uC0AC(Afirma, ThyroSeq)\uB294 \uBD80\uC815\uD615(III) \uB610\uB294 \uC5EC\uD3EC\uC131 \uBCD1\uBCC0(IV)\uC5D0\uC11C \uCD94\uAC00 \uC815\uBCF4\uB97C \uC81C\uACF5\uD569\uB2C8\uB2E4.',
    citations: [
      { title: 'ACR Thyroid Imaging, Reporting and Data System (TI-RADS)', journal: 'J Am Coll Radiol', year: 2017, doi: '10.1016/j.jacr.2017.01.046', relevance: '\uAC11\uC0C1\uC120 \uACB0\uC808 \uCD08\uC74C\uD30C \uBD84\uB958 \uCCB4\uACC4' },
      { title: '2015 American Thyroid Association Management Guidelines for Thyroid Nodules and Differentiated Thyroid Cancer', journal: 'Thyroid', year: 2016, doi: '10.1089/thy.2015.0020', relevance: 'ATA \uAC11\uC0C1\uC120 \uACB0\uC808 \uAC00\uC774\uB4DC\uB77C\uC778' },
      { title: 'The Bethesda System for Reporting Thyroid Cytopathology', journal: 'Thyroid', year: 2017, doi: '10.1089/thy.2017.0500', relevance: '\uC138\uD3EC\uD559\uC801 \uBD84\uB958 \uCCB4\uACC4' },
      { title: 'Molecular Testing for Thyroid Nodules: A Review', journal: 'JAMA', year: 2018, doi: '10.1001/jama.2018.0368', relevance: '\uBD84\uC790 \uAC80\uC0AC \uC5ED\uD560 \uB9AC\uBDF0' },
    ],
    confidence: 'high',
    relatedQuestions: [
      'Bethesda III/IV \uACB0\uC808\uC5D0\uC11C \uBD84\uC790 \uAC80\uC0AC\uC758 \uC5ED\uD560\uC740?',
      '\uAC11\uC0C1\uC120 \uBBF8\uC138\uC720\uB450\uC554\uC758 \uC801\uADF9\uC801 \uAC10\uC2DC \uAE30\uC900\uC740?',
      '\uAC11\uC0C1\uC120 \uACB0\uC808\uC758 \uCD94\uC801 \uCD08\uC74C\uD30C \uAC04\uACA9\uC740?',
      '\uBC29\uC0AC\uC131 \uC694\uC624\uB4DC \uCE58\uB8CC\uC758 \uC801\uC751\uC99D\uC740?',
    ],
  },
  hba1c: {
    answer:
      '<strong>\uACE0\uB839 \uB2F9\uB1E8\uBCD1 \uD658\uC790\uC758 HbA1c \uBAA9\uD45C</strong>\uB294 \uAC1C\uC778\uD654\uB41C \uC811\uADFC\uC774 \uD544\uC218\uC801\uC785\uB2C8\uB2E4. ' +
      'ADA 2024 \uAC00\uC774\uB4DC\uB77C\uC778\uC740 \uB2E4\uC74C\uACFC \uAC19\uC774 \uAD8C\uACE0\uD569\uB2C8\uB2E4: ' +
      '<strong>\uAC74\uAC15\uD55C \uACE0\uB839\uC790</strong>(\uB3D9\uBC18\uC9C8\uD658 \uC801\uC74C, \uC778\uC9C0\uAE30\uB2A5 \uC815\uC0C1, \uAE30\uB2A5 \uB3C5\uB9BD\uC801): HbA1c <7.0-7.5%. ' +
      '<strong>\uBCF5\uC7A1/\uC911\uAC04 \uAC74\uAC15</strong>(\uB2E4\uC218 \uB3D9\uBC18\uC9C8\uD658, \uACBD\uB3C4 \uC778\uC9C0\uC7A5\uC560, 2+ IADL \uC758\uC874): HbA1c <8.0%. ' +
      '<strong>\uB9E4\uC6B0 \uBCF5\uC7A1/\uBD88\uB7C9 \uAC74\uAC15</strong>(\uB9D0\uAE30 \uC9C8\uD658, \uC911\uB4F1\uB3C4-\uC911\uC99D \uC778\uC9C0\uC800\uD558, \uB2E4\uC218 ADL \uC758\uC874): HbA1c <8.5%. ' +
      '\uACFC\uB3C4\uD55C \uD608\uB2F9 \uAD00\uB9AC\uB294 \uC800\uD608\uB2F9 \uC704\uD5D8\uC744 \uC99D\uAC00\uC2DC\uD0A4\uBA70, \uD2B9\uD788 \uACE0\uB839\uC790\uC5D0\uC11C \uB099\uC0C1, \uACE8\uC808, \uC778\uC9C0\uAE30\uB2A5 \uC545\uD654\uC640 ' +
      '\uAD00\uB828\uB429\uB2C8\uB2E4. \uCE58\uB8CC \uB2E8\uC21C\uD654(deintensification)\uB3C4 \uC911\uC694\uD55C \uC804\uB7B5\uC785\uB2C8\uB2E4.',
    citations: [
      { title: 'Older Adults: Standards of Care in Diabetes - 2024', journal: 'Diabetes Care', year: 2024, doi: '10.2337/dc24-S013', relevance: '\uACE0\uB839\uC790 \uB2F9\uB1E8\uBCD1 \uAD00\uB9AC \uAC00\uC774\uB4DC\uB77C\uC778' },
      { title: 'Intensive Blood Glucose Control and Vascular Outcomes in Patients with Type 2 Diabetes (ADVANCE)', journal: 'N Engl J Med', year: 2008, doi: '10.1056/NEJMoa0802987', relevance: '\uC9D1\uC911 \uD608\uB2F9 \uAD00\uB9AC\uC758 \uACB0\uACFC' },
      { title: 'Hypoglycemia and Risk of Fall-Related Events in Older Adults', journal: 'Diabetes Care', year: 2012, doi: '10.2337/dc11-1028', relevance: '\uC800\uD608\uB2F9\uACFC \uB099\uC0C1 \uC704\uD5D8' },
      { title: 'Glycemic Targets in Older Adults with Diabetes: ADA Consensus Report', journal: 'Diabetes Care', year: 2021, doi: '10.2337/dci21-0034', relevance: '\uACE0\uB839\uC790 \uBAA9\uD45C \uD608\uB2F9 \uD569\uC758\uBB38' },
    ],
    confidence: 'high',
    relatedQuestions: [
      '\uACE0\uB839 \uB2F9\uB1E8\uBCD1 \uD658\uC790\uC5D0\uC11C \uC57D\uBB3C \uB2E8\uC21C\uD654(deintensification) \uC804\uB7B5\uC740?',
      '\uC778\uC9C0\uC800\uD558\uAC00 \uC788\uB294 \uB2F9\uB1E8\uBCD1 \uD658\uC790\uC758 \uC790\uAC00\uAD00\uB9AC \uC9C0\uC6D0 \uBC29\uBC95\uC740?',
      '\uC694\uC591\uC2DC\uC124 \uAC70\uC8FC \uB2F9\uB1E8\uBCD1 \uD658\uC790\uC758 \uD608\uB2F9 \uAD00\uB9AC \uBAA9\uD45C\uB294?',
      '\uACE0\uB839\uC790\uC5D0\uC11C GLP-1 \uC218\uC6A9\uCCB4 \uC791\uC6A9\uC81C\uC758 \uC548\uC804\uC131\uC740?',
    ],
  },
}

function findEvidence(question: string): EvidenceResponse {
  const q = question.toLowerCase()
  if (q.includes('\uB2F9\uB1E8') || q.includes('metformin') || q.includes('sglt2') || q.includes('glp-1') || q.includes('diabetes') || q.includes('\uD608\uB2F9') && (q.includes('\uC57D') || q.includes('\uCE58\uB8CC') || q.includes('\uAD00\uB9AC'))) {
    return evidenceDB.diabetes
  }
  if (q.includes('\uACE0\uD608\uC555') || q.includes('\uD608\uC555') || q.includes('hypertension') || q.includes('blood pressure')) {
    return evidenceDB.hypertension
  }
  if (q.includes('\uAC11\uC0C1\uC120') || q.includes('\uACB0\uC808') || q.includes('thyroid') || q.includes('nodule')) {
    return evidenceDB.thyroid
  }
  if (q.includes('hba1c') || q.includes('\uB2F9\uD654\uD608\uC0C9\uC18C') || q.includes('\uACE0\uB839') || q.includes('elderly') || q.includes('\uB178\uC778')) {
    return evidenceDB.hba1c
  }
  return {
    answer:
      '\uD574\uB2F9 \uC9C8\uBB38\uC5D0 \uB300\uD55C <strong>\uC784\uC0C1 \uADFC\uAC70</strong>\uB97C \uBD84\uC11D\uD558\uC600\uC2B5\uB2C8\uB2E4. ' +
      '\uD604\uC7AC \uB370\uC774\uD130\uBCA0\uC774\uC2A4\uC5D0 \uCD5C\uC801\uD654\uB41C \uC751\uB2F5\uC774 \uC900\uBE44\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC73C\uB098, \uAD00\uB828 \uBB38\uD5CC\uC744 \uAE30\uBC18\uC73C\uB85C \uC548\uB0B4\uB4DC\uB9BD\uB2C8\uB2E4. ' +
      '\uCD5C\uC2E0 \uAC00\uC774\uB4DC\uB77C\uC778\uACFC \uCCB4\uACC4\uC801 \uBB38\uD5CC\uACE0\uCC30\uC744 \uCC38\uACE0\uD558\uC5EC \uADFC\uAC70 \uAE30\uBC18 \uC758\uC0AC\uACB0\uC815\uC744 \uAD8C\uC7A5\uD569\uB2C8\uB2E4. ' +
      '\uBCF4\uB2E4 \uAD6C\uCCB4\uC801\uC778 \uC784\uC0C1 \uC2DC\uB098\uB9AC\uC624\uB97C \uC81C\uACF5\uD574 \uC8FC\uC2DC\uBA74 \uB354 \uC815\uD655\uD55C \uADFC\uAC70\uB97C \uC548\uB0B4\uB4DC\uB9B4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
    citations: [
      { title: 'Evidence-Based Medicine: How to Practice and Teach EBM', journal: 'Elsevier', year: 2023, doi: '10.1016/C2018-0-01322-7', relevance: '\uADFC\uAC70\uC911\uC2EC\uC758\uD559 \uBC29\uBC95\uB860' },
      { title: 'Users\' Guides to the Medical Literature: A Manual for Evidence-Based Clinical Practice', journal: 'JAMA Network', year: 2015, doi: '10.1001/jama.2014.16869', relevance: '\uC784\uC0C1 \uADFC\uAC70 \uD65C\uC6A9 \uAC00\uC774\uB4DC' },
    ],
    confidence: 'limited',
    relatedQuestions: [
      '\uC81C2\uD615 \uB2F9\uB1E8\uBCD1\uC758 \uCD5C\uC2E0 \uC57D\uBB3C\uCE58\uB8CC \uAC00\uC774\uB4DC\uB77C\uC778\uC740?',
      '\uACE0\uD608\uC555 1\uCC28 \uC57D\uC81C \uC120\uD0DD \uAE30\uC900\uC740?',
      '\uAC11\uC0C1\uC120 \uACB0\uC808 \uD3C9\uAC00\uB97C \uC704\uD55C TI-RADS \uAE30\uC900\uC740?',
      '\uACE0\uB839 \uB2F9\uB1E8\uBCD1 \uD658\uC790\uC758 HbA1c \uBAA9\uD45C\uCE58\uB294?',
    ],
  }
}

// ─── Gemini AI Integration ──────────────────────────────────────────

const SYSTEM_PROMPT = `You are a clinical evidence AI assistant. Answer medical questions in Korean based on the latest clinical guidelines and peer-reviewed research. Always provide:
1. A detailed evidence-based answer (in HTML with <strong> tags for emphasis)
2. Real citations from major journals (NEJM, JAMA, Lancet, etc.) with DOIs
3. Confidence level (high/moderate/limited)
4. 3-4 related follow-up questions

Respond ONLY with valid JSON (no markdown fences):
{
  "answer": "HTML formatted answer in Korean",
  "citations": [{"title": "Paper title", "journal": "Journal", "year": 2024, "doi": "10.xxx/xxx", "relevance": "Why relevant in Korean"}],
  "confidence": "high|moderate|limited",
  "relatedQuestions": ["Question 1 in Korean", ...]
}`

async function askAI(question: string, apiKey: string): Promise<EvidenceResponse> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nQuestion: ' + question }] }
          ],
          generationConfig: { temperature: 0.3 },
        }),
      }
    )

    if (!response.ok) throw new Error('Gemini API error')

    const data = await response.json() as any
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    // Try to parse JSON from the response
    const jsonMatch = content?.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed as EvidenceResponse
    }
    throw new Error('Could not parse response')
  } catch {
    // Fallback to static evidence
    return findEvidence(question)
  }
}

// ─── Blueprint Generator ────────────────────────────────────────────
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
      tagline: `${input.clinicalFocus || template.category} \uBD84\uC57C\uC758 AI \uAE30\uBC18 \uC758\uB8CC \uC194\uB8E8\uC158`,
      mission: `${input.targetAudience || '\uC758\uB8CC \uC804\uBB38\uAC00'}\uB97C \uC704\uD55C ${template.desc}`,
      template: template.name,
    },
    uiPlan: {
      screens: template.screens.map((s) => ({
        name: s.name,
        description: s.desc,
        priority: 'P0',
      })),
      designSystem: '\uB2E4\uD06C/\uB77C\uC774\uD2B8 \uBAA8\uB4DC \uC9C0\uC6D0, \uC758\uB8CC \uC811\uADFC\uC131 \uC900\uC218 (WCAG 2.1 AA)',
    },
    dataPlan: {
      entities: template.entities.map((e) => ({
        name: e,
        storage: 'Cloudflare D1 + R2',
        encryption: 'AES-256-GCM at rest',
      })),
      compliance: 'HIPAA / \uAC1C\uC778\uC815\uBCF4\uBCF4\uD638\uBC95 \uC900\uC218, PHI \uC554\uD638\uD654 \uBC0F \uC811\uADFC \uB85C\uADF8',
    },
    automationPlan: {
      aiFeatures: template.aiFeatures,
      customFeatures: input.aiAssistants
        ? input.aiAssistants.split(',').map((f) => f.trim())
        : ['\uC0AC\uC6A9\uC790 \uC815\uC758 AI \uAE30\uB2A5'],
      infrastructure: 'Cloudflare Workers AI + D1 + R2 + KV',
    },
    monetizationPlan: {
      model: input.monetization || 'Freemium + \uAD6C\uB3C5\uD615',
      tiers: [
        { name: '\uBB34\uB8CC', price: '\u20A90', features: ['\uAE30\uBCF8 \uBAA8\uB2C8\uD130\uB9C1', '\uC8FC\uAC04 \uB9AC\uD3EC\uD2B8 1\uD68C'] },
        { name: '\uD504\uB85C', price: '\u20A929,000/\uC6D4', features: ['AI \uC778\uC0AC\uC774\uD2B8', '\uC2E4\uC2DC\uAC04 \uC54C\uB9BC', '\uBB34\uC81C\uD55C \uB9AC\uD3EC\uD2B8'] },
        { name: '\uC5D4\uD130\uD504\uB77C\uC774\uC988', price: '\uB9DE\uCDA4 \uACAC\uC801', features: ['\uC804\uC6A9 \uC11C\uBC84', 'SLA \uBCF4\uC7A5', '\uCEE4\uC2A4\uD140 \uC778\uD14C\uADF8\uB808\uC774\uC158'] },
      ],
    },
    launchChecklist: [
      { phase: 'MVP (4\uC8FC)', tasks: ['\uD575\uC2EC \uD654\uBA74 \uAD6C\uD604', 'DB \uC2A4\uD0A4\uB9C8 \uC124\uACC4', '\uC778\uC99D \uC2DC\uC2A4\uD15C \uAD6C\uCD95'] },
      { phase: 'Beta (8\uC8FC)', tasks: ['AI \uAE30\uB2A5 \uD1B5\uD569', '\uC0AC\uC6A9\uC790 \uD14C\uC2A4\uD2B8', '\uC131\uB2A5 \uCD5C\uC801\uD654'] },
      { phase: 'Launch (12\uC8FC)', tasks: ['\uBCF4\uC548 \uAC10\uC0AC', '\uADDC\uC81C \uAC80\uD1A0', '\uC571\uC2A4\uD1A0\uC5B4 \uB4F1\uB85D'] },
    ],
    analytics: {
      kpi: ['DAU/MAU \uBE44\uC728', '\uC138\uC158 \uC2DC\uAC04', '\uAE30\uB2A5\uBCC4 \uC0AC\uC6A9\uB960', '\uC774\uD0C8\uB960', 'NPS'],
      tools: 'Cloudflare Analytics + Custom Events',
    },
    compliance: {
      standards: ['HIPAA', '\uAC1C\uC778\uC815\uBCF4\uBCF4\uD638\uBC95', 'GDPR (\uD574\uC678 \uC0AC\uC6A9\uC790)'],
      measures: ['PHI \uC554\uD638\uD654', '\uC811\uADFC \uB85C\uADF8', '\uAC10\uC0AC \uCD94\uC801', '\uB370\uC774\uD130 \uCD5C\uC18C \uC218\uC9D1'],
    },
    experiments: [
      { name: 'AI \uCD94\uCC9C \uC815\uD655\uB3C4 A/B \uD14C\uC2A4\uD2B8', metric: '\uC0AC\uC6A9\uC790 \uCC44\uD0DD\uB960', duration: '2\uC8FC' },
      { name: '\uC54C\uB9BC \uBE48\uB3C4 \uCD5C\uC801\uD654', metric: '\uB9AC\uD150\uC158\uC728', duration: '4\uC8FC' },
      { name: '\uC628\uBCF4\uB529 \uD50C\uB85C\uC6B0 \uD14C\uC2A4\uD2B8', metric: '\uC644\uB8CC\uC728', duration: '2\uC8FC' },
    ],
    differentiator: input.differentiator || '\uC784\uC0C1 \uADFC\uAC70 \uAE30\uBC18 AI \uC758\uC0AC\uACB0\uC815 \uC9C0\uC6D0',
    dataSources: input.dataSources
      ? input.dataSources.split(',').map((d) => d.trim())
      : ['CGM', 'EMR', '\uC6E8\uC5B4\uB7EC\uBE14 \uAE30\uAE30', 'PGHD'],
  }
}

// ─── Routes ─────────────────────────────────────────────────────────

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// API: Templates
app.get('/api/templates', (c) => c.json(templates))

// ─── Auth Routes ────────────────────────────────────────────────────

app.post('/api/auth/signup', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>()
  const { email, password } = body

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: '\uC720\uD6A8\uD55C \uC774\uBA54\uC77C \uC8FC\uC18C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.' }, 400)
  }

  // Validate password
  if (!password || password.length < 8) {
    return c.json({ error: '\uBE44\uBC00\uBC88\uD638\uB294 8\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.' }, 400)
  }

  // Check if user exists
  const existing = await c.env.USERS.get(`user:${email}`)
  if (existing) {
    return c.json({ error: '\uC774\uBBF8 \uB4F1\uB85D\uB41C \uC774\uBA54\uC77C\uC785\uB2C8\uB2E4.' }, 409)
  }

  // Create user
  const userId = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const userData: UserData = {
    id: userId,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  }
  await c.env.USERS.put(`user:${email}`, JSON.stringify(userData))

  // Create session
  const token = await createToken(userId, c.env.JWT_SECRET)
  const session: SessionData = { userId, email }
  await c.env.SESSIONS.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 7 * 24 * 60 * 60 })

  return c.json({ token, user: { email } })
})

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>()
  const { email, password } = body

  if (!email || !password) {
    return c.json({ error: '\uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.' }, 400)
  }

  const raw = await c.env.USERS.get(`user:${email}`)
  if (!raw) {
    return c.json({ error: '\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.' }, 401)
  }

  const userData = JSON.parse(raw) as UserData
  const valid = await verifyPassword(password, userData.passwordHash)
  if (!valid) {
    return c.json({ error: '\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.' }, 401)
  }

  // Create session
  const token = await createToken(userData.id, c.env.JWT_SECRET)
  const session: SessionData = { userId: userData.id, email: userData.email }
  await c.env.SESSIONS.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 7 * 24 * 60 * 60 })

  return c.json({ token, user: { email: userData.email } })
})

app.get('/api/auth/me', async (c) => {
  const user = await getUser(c)
  if (!user) {
    return c.json({ error: '\uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.' }, 401)
  }

  return c.json({ email: user.email })
})

app.post('/api/auth/logout', async (c) => {
  const auth = c.req.header('Authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    await c.env.SESSIONS.delete(`session:${token}`)
  }
  return c.json({ success: true })
})


// ─── API: Evidence AI ───────────────────────────────────────────────

app.post('/api/ask', async (c) => {
  const body = await c.req.json<{ question: string }>()
  if (!body.question || body.question.trim().length === 0) {
    return c.json({ error: '\uC9C8\uBB38\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.' }, 400)
  }

  const user = await getUser(c)

  // Authenticated users get GLM-4 AI (unlimited, free)
  if (user) {
    const result = await askAI(body.question, c.env.GEMINI_API_KEY)
    return c.json(result)
  }

  // Unauthenticated: use static evidence fallback
  const result = findEvidence(body.question)
  return c.json(result)
})

// API: Blueprint Generator
app.post('/api/generate', async (c) => {
  const body = await c.req.json<BlueprintInput>()
  if (!body.templateKey) {
    return c.json({ error: '\uD15C\uD50C\uB9BF\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.' }, 400)
  }
  const blueprint = generateBlueprint(body)
  return c.json(blueprint)
})

// ─── Landing page ───────────────────────────────────────────────────

app.get('/', (c) => {
  return c.render(
    <div class="container">
      {/* Navigation */}
      <nav class="nav">
        <a href="/" class="nav-brand">Endo App Forge</a>
        <div class="nav-links">
          <a href="#" data-tab="evidence">Evidence AI</a>
          <a href="#" data-tab="forge">App Forge</a>
          <a href="#" data-tab="pricing">{'\uC18C\uAC1C'}</a>
          <a href="#" id="auth-btn" class="btn btn-outline btn-sm">{'\uB85C\uADF8\uC778'}</a>
          <div id="user-menu" class="hidden user-menu">
            <span id="user-email" class="text-sm text-secondary"></span>
            <button id="logout-btn" class="btn btn-outline btn-sm">{'\uB85C\uADF8\uC544\uC6C3'}</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section class="hero">
        <div class="badge">Endo App Forge &mdash; Beta</div>
        <h1>
          {'\uC758\uB8CC \uC804\uBB38\uAC00\uB97C \uC704\uD55C'}
          <br />
          <span class="accent">AI {'\uC784\uC0C1 \uADFC\uAC70 \uD50C\uB7AB\uD3FC'}</span>
        </h1>
        <p>
          {'\uC784\uC0C1 \uC9C8\uBB38\uC5D0 \uB300\uD55C \uADFC\uAC70 \uAE30\uBC18 \uB2F5\uBCC0\uACFC \uC758\uB8CC \uC571 \uBE14\uB8E8\uD504\uB9B0\uD2B8\uB97C AI\uAC00 \uC0DD\uC131\uD569\uB2C8\uB2E4. '}
          {'\uCD5C\uC2E0 \uAC00\uC774\uB4DC\uB77C\uC778\uACFC \uC8FC\uC694 \uC5F0\uAD6C\uB97C \uAE30\uBC18\uC73C\uB85C \uC2E0\uB8B0\uD560 \uC218 \uC788\uB294 \uC815\uBCF4\uB97C \uC81C\uACF5\uD569\uB2C8\uB2E4.'}
        </p>
      </section>

      {/* Ad Banner - Top */}
      <div class="ad-banner" id="ad-top">
        <div class="ad-placeholder">Advertisement</div>
      </div>

      {/* Tabs */}
      <div class="tabs">
        <button class="tab active" data-tab="evidence">Evidence AI</button>
        <button class="tab" data-tab="forge">App Forge</button>
        <button class="tab" data-tab="pricing">{'\uC18C\uAC1C'}</button>
      </div>

      {/* Tab 1: Evidence AI */}
      <div id="panel-evidence" class="tab-panel active">
        <div class="section">
          <h2 class="section-title">{'\uC784\uC0C1 \uADFC\uAC70 AI \uAC80\uC0C9'}</h2>
          <p class="section-desc">
            {'\uC784\uC0C1 \uC9C8\uBB38\uC744 \uC785\uB825\uD558\uBA74 \uCD5C\uC2E0 \uAC00\uC774\uB4DC\uB77C\uC778\uACFC \uC8FC\uC694 \uC5F0\uAD6C \uADFC\uAC70\uB97C \uAE30\uBC18\uC73C\uB85C \uB2F5\uBCC0\uD569\uB2C8\uB2E4.'}
          </p>

          <div class="ask-box">
            <input
              type="text"
              id="ask-input"
              class="ask-input"
              placeholder={'\uC784\uC0C1 \uC9C8\uBB38\uC744 \uC785\uB825\uD558\uC138\uC694... (\uC608: \uC81C2\uD615 \uB2F9\uB1E8\uBCD1 1\uCC28 \uC57D\uC81C \uC120\uD0DD \uAE30\uC900\uC740?)'}
            />
            <button id="ask-btn" class="btn btn-primary ask-btn">{'\uAC80\uC0C9'}</button>
          </div>

          <div class="quick-questions">
            <button class="quick-chip" data-question={'\uC81C2\uD615 \uB2F9\uB1E8\uBCD1\uC758 \uCD5C\uC2E0 \uC57D\uBB3C\uCE58\uB8CC \uAC00\uC774\uB4DC\uB77C\uC778\uC740?'}>
              {'\uC81C2\uD615 \uB2F9\uB1E8\uBCD1 \uC57D\uBB3C\uCE58\uB8CC'}
            </button>
            <button class="quick-chip" data-question={'\uACE0\uD608\uC555 1\uCC28 \uC57D\uC81C \uC120\uD0DD \uAE30\uC900\uC740?'}>
              {'\uACE0\uD608\uC555 \uCE58\uB8CC \uAC00\uC774\uB4DC\uB77C\uC778'}
            </button>
            <button class="quick-chip" data-question={'\uAC11\uC0C1\uC120 \uACB0\uC808 \uD3C9\uAC00\uB97C \uC704\uD55C TI-RADS \uAE30\uC900\uC740?'}>
              {'\uAC11\uC0C1\uC120 \uACB0\uC808 \uD3C9\uAC00'}
            </button>
            <button class="quick-chip" data-question={'\uACE0\uB839 \uB2F9\uB1E8\uBCD1 \uD658\uC790\uC758 HbA1c \uBAA9\uD45C\uCE58\uB294?'}>
              {'\uACE0\uB839 \uD658\uC790 HbA1c \uBAA9\uD45C'}
            </button>
          </div>

          {/* Ad Banner - Evidence Inline */}
          <div class="ad-banner ad-inline" id="ad-evidence">
            <div class="ad-placeholder">Advertisement</div>
          </div>

          <div id="evidence-loading" class="hidden mt-6">
            <div class="loading-bar"></div>
            <p class="text-sm text-muted">{'\uADFC\uAC70\uB97C \uBD84\uC11D\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4'}<span class="loading-dots"></span></p>
          </div>

          <div id="evidence-results" class="mt-6"></div>
        </div>
      </div>

      {/* Tab 2: App Forge */}
      <div id="panel-forge" class="tab-panel">
        <div class="section">
          <h2 class="section-title">{'\uC758\uB8CC \uC571 \uBE14\uB8E8\uD504\uB9B0\uD2B8 \uC0DD\uC131'}</h2>
          <p class="section-desc">
            {'\uD15C\uD50C\uB9BF\uC744 \uC120\uD0DD\uD558\uACE0 \uD504\uB85C\uC81D\uD2B8 \uC815\uBCF4\uB97C \uC785\uB825\uD558\uBA74 AI\uAC00 \uC644\uC804\uD55C \uC571 \uC124\uACC4 \uBE14\uB8E8\uD504\uB9B0\uD2B8\uB97C \uC0DD\uC131\uD569\uB2C8\uB2E4.'}
          </p>

          <div class="grid-2">
            <div>
              <div class="form-group">
                <label class="form-label">{'\uD15C\uD50C\uB9BF \uC120\uD0DD'}</label>
                <select id="template-select" class="form-select">
                  <option value="">{'\uD15C\uD50C\uB9BF\uC744 \uC120\uD0DD\uD558\uC138\uC694...'}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{'\uD504\uB85C\uC81D\uD2B8 \uC774\uB984'}</label>
                <input type="text" id="project-name" class="form-input" placeholder={'\uC608: GlucoSense Pro'} />
              </div>
              <div class="form-group">
                <label class="form-label">{'\uD0C0\uAC9F \uC0AC\uC6A9\uC790'}</label>
                <input type="text" id="target-audience" class="form-input" placeholder={'\uC608: \uB0B4\uBD84\uBE44\uB0B4\uACFC \uC804\uBB38\uC758, \uB2F9\uB1E8\uBCD1 \uD658\uC790'} />
              </div>
              <div class="form-group">
                <label class="form-label">{'\uC784\uC0C1 \uCD08\uC810 \uC601\uC5ED'}</label>
                <input type="text" id="clinical-focus" class="form-input" placeholder={'\uC608: \uC81C2\uD615 \uB2F9\uB1E8\uBCD1 \uAD00\uB9AC'} />
              </div>
            </div>
            <div>
              <div class="form-group">
                <label class="form-label">{'\uCC28\uBCC4\uD654 \uD3EC\uC778\uD2B8'}</label>
                <textarea id="differentiator" class="form-textarea" placeholder={'\uAE30\uC874 \uC194\uB8E8\uC158\uACFC\uC758 \uCC28\uBCC4\uC810\uC744 \uC124\uBA85\uD558\uC138\uC694...'}></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">{'\uB370\uC774\uD130 \uC18C\uC2A4 (\uC274\uD45C \uAD6C\uBD84)'}</label>
                <input type="text" id="data-sources" class="form-input" placeholder={'\uC608: CGM, EMR, \uC6E8\uC5B4\uB7EC\uBE14, PGHD'} />
              </div>
              <div class="form-group">
                <label class="form-label">{'\uC218\uC775 \uBAA8\uB378'}</label>
                <input type="text" id="monetization" class="form-input" placeholder={'\uC608: Freemium + \uAD6C\uB3C5\uD615'} />
              </div>
              <div class="form-group">
                <label class="form-label">{'AI \uAE30\uB2A5 (\uC274\uD45C \uAD6C\uBD84)'}</label>
                <input type="text" id="ai-assistants" class="form-input" placeholder={'\uC608: \uD608\uB2F9 \uC608\uCE21, \uC2DD\uB2E8 \uCD94\uCC9C, \uBCF5\uC57D \uC54C\uB9BC'} />
              </div>
            </div>
          </div>

          <div class="mt-4">
            <button id="generate-btn" class="btn btn-primary w-full">{'\uBE14\uB8E8\uD504\uB9B0\uD2B8 \uC0DD\uC131'}</button>
          </div>

          {/* Ad Banner - Forge Inline */}
          <div class="ad-banner ad-inline" id="ad-forge">
            <div class="ad-placeholder">Advertisement</div>
          </div>

          <div id="forge-loading" class="hidden mt-6">
            <div class="loading-bar"></div>
            <p class="text-sm text-muted">{'\uBE14\uB8E8\uD504\uB9B0\uD2B8\uB97C \uC0DD\uC131\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4'}<span class="loading-dots"></span></p>
          </div>

          <div id="forge-results" class="mt-6"></div>
        </div>
      </div>

      {/* Tab 3: About (was Pricing) */}
      <div id="panel-pricing" class="tab-panel">
        <div class="section text-center">
          <h2 class="section-title">{'\uBB34\uB8CC\uB85C \uC0AC\uC6A9\uD558\uC138\uC694'}</h2>
          <p class="section-desc">{'Endo App Forge\uB294 \uBAA8\uB4E0 \uAE30\uB2A5\uC744 \uBB34\uB8CC\uB85C \uC81C\uACF5\uD569\uB2C8\uB2E4. \uD68C\uC6D0\uAC00\uC785\uB9CC \uD558\uBA74 AI \uC784\uC0C1 \uADFC\uAC70 \uAC80\uC0C9\uACFC \uC571 \uBE14\uB8E8\uD504\uB9B0\uD2B8 \uC0DD\uC131\uC744 \uBB34\uC81C\uD55C\uC73C\uB85C \uC774\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}</p>

          <div class="grid-3">
            <div class="card">
              <h3>{'AI \uC784\uC0C1 \uADFC\uAC70 \uAC80\uC0C9'}</h3>
              <p>{'GLM-4 AI \uAE30\uBC18 \uCD5C\uC2E0 \uAC00\uC774\uB4DC\uB77C\uC778 \uBC0F \uC5F0\uAD6C \uADFC\uAC70 \uAC80\uC0C9. \uBB34\uC81C\uD55C \uC9C8\uC758.'}</p>
            </div>
            <div class="card">
              <h3>{'\uC571 \uBE14\uB8E8\uD504\uB9B0\uD2B8 \uC0DD\uC131'}</h3>
              <p>{'\uC758\uB8CC \uC571 \uC124\uACC4 \uBE14\uB8E8\uD504\uB9B0\uD2B8\uB97C AI\uAC00 \uC790\uB3D9 \uC0DD\uC131. \uBB34\uC81C\uD55C \uC0DD\uC131.'}</p>
            </div>
            <div class="card">
              <h3>{'3\uC885 \uC758\uB8CC \uD15C\uD50C\uB9BF'}</h3>
              <p>{'\uD608\uB2F9 \uAD00\uB9AC, \uC784\uC0C1\uC2DC\uD5D8, \uB300\uC0AC \uCF54\uCE6D \uC804\uBB38 \uD15C\uD50C\uB9BF \uC81C\uACF5.'}</p>
            </div>
          </div>

          <div class="mt-6">
            <button class="btn btn-primary btn-lg" id="free-signup-btn">{'\uBB34\uB8CC \uD68C\uC6D0\uAC00\uC785'}</button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <div id="auth-modal" class="modal hidden">
        <div class="modal-content">
          <button class="modal-close" id="modal-close">&times;</button>
          <h2 id="auth-title">{'\uB85C\uADF8\uC778'}</h2>
          <form id="auth-form">
            <div class="form-group">
              <label class="form-label">{'\uC774\uBA54\uC77C'}</label>
              <input type="email" id="auth-email" class="form-input" placeholder="your@email.com" required />
            </div>
            <div class="form-group">
              <label class="form-label">{'\uBE44\uBC00\uBC88\uD638'}</label>
              <input type="password" id="auth-password" class="form-input" placeholder={'8\uC790 \uC774\uC0C1'} required minLength={8} />
            </div>
            <div id="auth-error" class="auth-error hidden"></div>
            <button type="submit" class="btn btn-primary w-full" id="auth-submit">{'\uB85C\uADF8\uC778'}</button>
          </form>
          <p class="auth-switch mt-4 text-center text-sm">
            {'\uACC4\uC815\uC774 \uC5C6\uC73C\uC2E0\uAC00\uC694? '}<a href="#" id="auth-toggle" class="text-blue">{'\uD68C\uC6D0\uAC00\uC785'}</a>
          </p>
        </div>
      </div>

      {/* Ad Banner - Bottom */}
      <div class="ad-banner" id="ad-bottom">
        <div class="ad-placeholder">Advertisement</div>
      </div>

      {/* Footer */}
      <footer class="footer">
        <div>&copy; 2025 Endo App Forge. All rights reserved.</div>
        <div class="footer-links">
          <a href="#">{'\uC774\uC6A9\uC57D\uAD00'}</a>
          <a href="#">{'\uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68'}</a>
          <a href="#">{'\uBB38\uC758\uD558\uAE30'}</a>
        </div>
      </footer>
    </div>,
    { title: 'Endo App Forge - AI \uC784\uC0C1 \uADFC\uAC70 \uD50C\uB7AB\uD3FC' }
  )
})

export default app
