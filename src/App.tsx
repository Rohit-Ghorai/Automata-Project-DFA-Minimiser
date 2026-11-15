import React, { Component, ErrorInfo, ReactNode, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, CirclePlay, FileJson, Gauge, GitBranch, Info, Layers3, Menu, Pause, Play, RotateCcw, Sparkles, StepBack, StepForward, Table2, X, Zap } from 'lucide-react'
import { DFA, minimizeDFA, validateDFA } from './algorithm'

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  public state: { hasError: boolean; error: Error | null } = { hasError: false, error: null }
  public static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error('Uncaught render error:', error, errorInfo) }
  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0b14', color: '#f8fafc', padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#ff6b81' }}>Something went wrong</h2>
          <p style={{ maxWidth: '500px', marginBottom: '1.5rem', color: '#94a3b8' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button onClick={() => { window.location.reload() }} style={{ padding: '0.75rem 1.5rem', background: '#8d7cff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
            Reload Simulator
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const sample: DFA = {
  states: ['q0', 'q1', 'q2', 'q3', 'q4', 'dead'],
  alphabet: ['0', '1'],
  startState: 'q0',
  finalStates: ['q2', 'q3'],
  transitions: {
    q0: { '0': 'q1', '1': 'q2' }, q1: { '0': 'q2', '1': 'q2' },
    q2: { '0': 'q2', '1': 'q2' }, q3: { '0': 'q2', '1': 'q2' },
    q4: { '0': 'q4', '1': 'q4' }, dead: { '0': 'dead', '1': 'dead' }
  }
}
type Page = 'home' | 'input' | 'simulate' | 'result' | 'testing' | 'theory'
const nav: { id: Page, label: string }[] = [{ id: 'home', label: 'Overview' }, { id: 'input', label: 'DFA Builder' }, { id: 'simulate', label: 'Simulation' }, { id: 'result', label: 'Minimized DFA' }, { id: 'testing', label: 'String Lab' }, { id: 'theory', label: 'Theory' }]
const clone = (dfa: DFA): DFA => JSON.parse(JSON.stringify(dfa))

function Diagram({ dfa, highlight = [], compact = false }: { dfa: DFA, highlight?: string[], compact?: boolean }) {
  const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({})
  const [drag, setDrag] = useState<string | null>(null)
  const width = compact ? 450 : 690, height = compact ? 230 : 330

  useEffect(() => {
    if (!dfa.states.length) return
    setPositions((previous) => {
      const defaults: Record<string, { x: number, y: number }> = {}
      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.min(width, height) / 2 - (compact ? 52 : 68)
      dfa.states.forEach((state, index) => {
        const angle = (Math.PI * 2 * index) / dfa.states.length - Math.PI / 2
        defaults[state] = previous[state] ?? {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        }
      })
      return { ...previous, ...defaults }
    })
  }, [dfa.states.join('|'), width, height])

  if (!dfa.states.length) {
    return (
      <div className="diagram-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: height, color: '#94a3b8' }}>
        <span>No states defined yet</span>
      </div>
    )
  }

  const node = (state: string) => {
    const position = positions[state] ?? { x: width / 2, y: height / 2 }
    return { state, ...position }
  }

  const nodes = dfa.states.map((state) => node(state))

  // Group transitions by source and target so symbols on the same path (e.g. 0, 1) share one clean arrow
  const edgeMap = new Map<string, { source: string, target: string, symbols: string[] }>()
  dfa.states.forEach((source) => {
    dfa.alphabet.forEach((symbol) => {
      const target = dfa.transitions[source]?.[symbol]
      if (target && dfa.states.includes(target)) {
        const key = `${source}->${target}`
        const existing = edgeMap.get(key)
        if (existing) {
          if (!existing.symbols.includes(symbol)) existing.symbols.push(symbol)
        } else {
          edgeMap.set(key, { source, target, symbols: [symbol] })
        }
      }
    })
  })
  const edges = Array.from(edgeMap.values()).map((e) => ({
    ...e,
    label: e.symbols.join(', ')
  }))

  const arrowMarker = (id: string, color: string) => (
    <marker id={id} markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M 0 0 L 12 6 L 0 12 z" fill={color} stroke={color} strokeWidth="1" />
    </marker>
  )

  return <div className="diagram-shell">
    <svg viewBox={`0 0 ${width} ${height}`} onMouseMove={(e) => { if (!drag) return; const rect = e.currentTarget.getBoundingClientRect(); setPositions((p) => ({ ...p, [drag]: { x: (e.clientX - rect.left) / rect.width * width, y: (e.clientY - rect.top) / rect.height * height } })) }} onMouseUp={() => setDrag(null)} onMouseLeave={() => setDrag(null)}>
      <defs>
        {arrowMarker('arrowhead-purple', '#8d7cff')}
        {arrowMarker('arrowhead-cyan', '#5de6ef')}
        {arrowMarker('arrowhead-start', '#5de6ef')}
      </defs>
      {edges.map((edge) => {
        const from = node(edge.source)
        const to = node(edge.target)
        const loop = edge.source === edge.target
        const active = highlight.includes(edge.source)
        const color = active ? '#5de6ef' : '#8d7cff'

        if (loop) {
          const vx = from.x - width / 2
          const vy = from.y - height / 2
          const dist = Math.hypot(vx, vy)
          const rox = dist > 8 ? vx / dist : 0
          const roy = dist > 8 ? vy / dist : -1
          const tox = -roy
          const toy = rox
          const nodeRadius = 25
          const loopReach = 36

          const startX = from.x + rox * (nodeRadius - 2) + tox * 13
          const startY = from.y + roy * (nodeRadius - 2) + toy * 13
          const cp1X = from.x + rox * (nodeRadius + loopReach) + tox * 25
          const cp1Y = from.y + roy * (nodeRadius + loopReach) + toy * 25
          const cp2X = from.x + rox * (nodeRadius + loopReach) - tox * 25
          const cp2Y = from.y + roy * (nodeRadius + loopReach) - toy * 25
          const endX = from.x + rox * (nodeRadius - 2) - tox * 13
          const endY = from.y + roy * (nodeRadius - 2) - toy * 13

          const curve = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
          const rawLabelX = from.x + rox * (nodeRadius + loopReach + 12)
          const rawLabelY = from.y + roy * (nodeRadius + loopReach + 12)
          const labelX = Math.max(16, Math.min(width - 16, rawLabelX))
          const labelY = Math.max(14, Math.min(height - 14, rawLabelY))

          return <g key={`${edge.source}-loop`} className={active ? 'edge active' : 'edge'}>
            <path d={curve} stroke={color} fill="none" strokeWidth="1.8" markerEnd={`url(#arrowhead-${active ? 'cyan' : 'purple'})`} />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#dfe2ff"
              fontSize="11"
              style={{ paintOrder: 'stroke fill', stroke: '#0b0f2a', strokeWidth: 4, strokeLinejoin: 'round' }}
            >
              {edge.label}
            </text>
          </g>
        }

        const hasReverse = edgeMap.has(`${edge.target}->${edge.source}`)
        const dx = to.x - from.x
        const dy = to.y - from.y
        const distance = Math.hypot(dx, dy) || 1
        const ux = dx / distance
        const uy = dy / distance
        const nx = -uy
        const ny = ux
        const nodeRadius = 25
        const startX = from.x + ux * nodeRadius
        const startY = from.y + uy * nodeRadius
        const endX = to.x - ux * nodeRadius
        const endY = to.y - uy * nodeRadius

        let curve = ''
        let labelX = 0
        let labelY = 0

        if (hasReverse) {
          const curveOffset = 22
          const controlX = (startX + endX) / 2 + nx * curveOffset
          const controlY = (startY + endY) / 2 + ny * curveOffset
          curve = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
          labelX = (startX + endX) / 4 + controlX / 2 + nx * 10
          labelY = (startY + endY) / 4 + controlY / 2 + ny * 10
        } else {
          curve = `M ${startX} ${startY} L ${endX} ${endY}`
          labelX = (startX + endX) / 2 + nx * 11
          labelY = (startY + endY) / 2 + ny * 11
        }

        return <g key={`${edge.source}->${edge.target}`} className={active ? 'edge active' : 'edge'}>
          <path d={curve} stroke={color} fill="none" strokeWidth="1.8" markerEnd={`url(#arrowhead-${active ? 'cyan' : 'purple'})`} />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#dfe2ff"
            fontSize="11"
            style={{ paintOrder: 'stroke fill', stroke: '#0b0f2a', strokeWidth: 4, strokeLinejoin: 'round' }}
          >
            {edge.label}
          </text>
        </g>
      })}
      {nodes.map((n) => <g key={n.state} className={`node ${highlight.includes(n.state) ? 'node-highlight' : ''}`} onMouseDown={() => setDrag(n.state)}><circle cx={n.x} cy={n.y} r="25" />{dfa.finalStates.includes(n.state) && <circle cx={n.x} cy={n.y} r="20" className="final-ring" />}<text x={n.x} y={n.y + 5}>{n.state}</text>{n.state === dfa.startState && <><path d={`M ${n.x - 58} ${n.y - 35} L ${n.x - 28} ${n.y - 8}`} stroke="#5de6ef" fill="none" strokeWidth="1.5" markerEnd="url(#arrowhead-start)" className="start-edge" /><text x={n.x - 66} y={n.y - 43} className="start-label">start</text></>}</g>)}
    </svg>
    {!compact && <span className="diagram-tip">Drag states to explore the automaton</span>}
  </div>
}

function Table({ dfa, editable = false, onChange }: { dfa: DFA, editable?: boolean, onChange?: (dfa: DFA) => void }) {
  if (!dfa.states.length || !dfa.alphabet.length) {
    return <div className="table-wrap"><p style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>Define states and alphabet symbols above to view the transition table.</p></div>
  }
  return <div className="table-wrap"><table><thead><tr><th>State</th>{dfa.alphabet.map((s) => <th key={s}>on <b>{s}</b></th>)}</tr></thead><tbody>{dfa.states.map((state) => <tr key={state}><td><span className={state === dfa.startState ? 'start-dot' : ''}>{state}</span>{dfa.finalStates.includes(state) && <span className="final-badge">F</span>}</td>{dfa.alphabet.map((symbol) => <td key={symbol}>{editable ? <select value={dfa.transitions[state]?.[symbol] ?? ''} onChange={(e) => onChange?.({ ...dfa, transitions: { ...dfa.transitions, [state]: { ...dfa.transitions[state], [symbol]: e.target.value } } })}>{dfa.states.map((s) => <option key={s}>{s}</option>)}</select> : dfa.transitions[state]?.[symbol]}</td>)}</tr>)}</tbody></table></div>
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [dfa, setDfa] = useState<DFA>(clone(sample))
  const [statesText, setStatesText] = useState(sample.states.join(', '))
  const [alphabetText, setAlphabetText] = useState(sample.alphabet.join(', '))
  const [finalStatesText, setFinalStatesText] = useState(sample.finalStates.join(', '))
  const [json, setJson] = useState(JSON.stringify(sample, null, 2))
  const [errors, setErrors] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const [menu, setMenu] = useState(false)
  const result = useMemo(() => minimizeDFA(dfa), [dfa])
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)

  // Reset simulation to step 0 whenever the DFA changes
  useEffect(() => {
    setStep(0)
    setRunning(false)
  }, [dfa])

  const maxStep = Math.max(0, result.steps.length - 1)
  const currentStep = Math.min(step, maxStep)
  const progress = result.steps.length > 0 ? Math.min(100, Math.round(((currentStep + 1) / result.steps.length) * 100)) : 0

  useEffect(() => {
    if (!running || !result.steps.length) return
    const timer = window.setInterval(() => setStep((s) => {
      if (s >= result.steps.length - 1) {
        setRunning(false)
        return s
      }
      return s + 1
    }), 2600 / speed)
    return () => clearInterval(timer)
  }, [running, speed, result.steps.length])

  const go = (next: Page) => {
    if (next === 'simulate') {
      setStep(0)
      setRunning(false)
    }
    setPage(next)
    setMenu(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const load = (value: DFA) => {
    setDfa(clone(value))
    setStatesText(value.states.join(', '))
    setAlphabetText(value.alphabet.join(', '))
    setFinalStatesText(value.finalStates.join(', '))
    setJson(JSON.stringify(value, null, 2))
    setErrors([])
    setStep(0)
    setRunning(false)
  }
  const validate = () => { const found = validateDFA(dfa); setErrors(found); setToast(found.length ? `${found.length} validation issue${found.length > 1 ? 's' : ''} found` : 'DFA is complete and valid'); window.setTimeout(() => setToast(''), 2800) }
  const current = (result.steps && result.steps.length > 0)
    ? (result.steps[currentStep] ?? result.steps[0])
    : { title: 'Ready', description: 'Configure DFA to start simulation.', partitions: [], phase: 'Ready' }
  return <div className="app">
    <header className="topbar"><button className="brand" onClick={() => go('home')}><span className="brand-mark"><Sparkles size={16} /></span><span>DFA<span className="gradient-text">.lab</span></span></button><button className="mobile-menu" onClick={() => setMenu(!menu)}><Menu /></button><nav className={menu ? 'nav open' : 'nav'}>{nav.slice(0, 5).map((item) => <button key={item.id} className={page === item.id ? 'nav-active' : ''} onClick={() => go(item.id)}>{item.label}</button>)}<button className="nav-cta" onClick={() => go('input')}><Zap size={15} /> Build DFA</button></nav></header>
    <main>
      {page === 'home' && <Home go={go} dfa={dfa} />}
      {page === 'input' && <section className="page-section"><PageHeading eyebrow="01 / DFA BUILDER" title="Define your automaton." subtitle="Start with a complete deterministic finite automaton. We will validate every transition before the algorithm begins." /><div className="builder-grid"><div className="panel form-panel"><div className="panel-title"><span><GitBranch size={18} /> State machine</span><button className="text-button" onClick={() => load(sample)}>Load sample</button></div><div className="field-grid"><label>States<input value={statesText} placeholder="q0, q1, q2" onChange={(e) => { const text = e.target.value; setStatesText(text); const states = text.split(',').map((x) => x.trim()).filter(Boolean); const validStartState = states.includes(dfa.startState) ? dfa.startState : (states[0] ?? ''); const validFinalStates = dfa.finalStates.filter((s) => states.includes(s)); const transitions: Record<string, Record<string, string>> = {}; states.forEach((s) => { transitions[s] = {}; dfa.alphabet.forEach((a) => { const currentTarget = dfa.transitions[s]?.[a]; transitions[s][a] = (currentTarget && states.includes(currentTarget)) ? currentTarget : (states[0] ?? ''); }); }); setDfa({ ...dfa, states, startState: validStartState, finalStates: validFinalStates, transitions }); }} /><small>Comma-separated, e.g. q0, q1, q2</small></label><label>Alphabet<input value={alphabetText} placeholder="0, 1" onChange={(e) => { const text = e.target.value; setAlphabetText(text); const alphabet = text.split(',').map((x) => x.trim()).filter(Boolean); const transitions: Record<string, Record<string, string>> = {}; dfa.states.forEach((s) => { transitions[s] = {}; alphabet.forEach((a) => { transitions[s][a] = dfa.transitions[s]?.[a] ?? (dfa.states[0] ?? ''); }); }); setDfa({ ...dfa, alphabet, transitions }); }} /><small>Symbols separated by commas</small></label><label>Start state<select value={dfa.startState} onChange={(e) => setDfa({ ...dfa, startState: e.target.value })}>{!dfa.states.includes(dfa.startState) && <option value="">-- Select state --</option>}{dfa.states.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><label>Final states<input value={finalStatesText} placeholder="q2, q3" onChange={(e) => { const text = e.target.value; setFinalStatesText(text); const finalStates = text.split(',').map((x) => x.trim()).filter(Boolean); setDfa({ ...dfa, finalStates }); }} /><small>Accepting states separated by commas</small></label></div><div className="panel-title table-heading"><span><Table2 size={18} /> Transition function</span></div><Table dfa={dfa} editable onChange={setDfa} /><div className="action-row"><button className="button secondary" onClick={validate}><Check size={17} /> Validate DFA</button><button className="button primary" onClick={() => { const found = validateDFA(dfa); setErrors(found); if (!found.length) go('simulate') }}>Run minimisation <ArrowRight size={17} /></button></div>{errors.length > 0 && <div className="error-box">{errors.map((e) => <div key={e}><X size={14} />{e}</div>)}</div>}{toast && <div className="toast"><Check size={15} />{toast}</div>}</div><div className="side-stack"><div className="panel json-panel"><div className="panel-title"><span><FileJson size={18} /> JSON input</span><button className="icon-button" title="Reset JSON" onClick={() => setJson(JSON.stringify(dfa, null, 2))}><RotateCcw size={15} /></button></div><textarea value={json} onChange={(e) => setJson(e.target.value)} /><button className="button outline full" onClick={() => { try { const parsed = JSON.parse(json) as DFA; setDfa(parsed); setStatesText((parsed.states || []).join(', ')); setAlphabetText((parsed.alphabet || []).join(', ')); setFinalStatesText((parsed.finalStates || []).join(', ')); setErrors([]); setToast('JSON loaded successfully') } catch { setErrors(['JSON is not valid. Check commas, quotes and braces.']) } }}>Apply JSON</button></div><div className="tip-card"><Info size={18} /><div><b>What makes a DFA complete?</b><p>Each state needs exactly one destination for every symbol in the alphabet. No guessing, no ambiguity.</p></div></div></div></div></section>}
      {page === 'simulate' && <section className="page-section"><PageHeading eyebrow="02 / LIVE SIMULATION" title="Watch the proof unfold." subtitle="Every frame below is a real snapshot from reachability analysis and partition refinement." /><div className="simulation-layout"><div className="panel simulation-main"><div className="sim-top"><div><span className="phase-label">{current.phase}</span><h2>{current.title}</h2><p>{current.description}</p></div><div className="speed"><Gauge size={16} /> <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></div></div><div className="progress"><span style={{ width: `${progress}%` }} /></div><div className="step-count">Step {result.steps.length ? currentStep + 1 : 0} of {result.steps.length}<b>{progress}%</b></div><div className="partition-board"><h3>Current partitions</h3><div className="partitions">{current.partitions.map((group, i) => <motion.div layout key={`${i}-${group.join()}`} className={`partition ${current.highlighted?.some((s) => group.includes(s)) ? 'partition-hot' : ''}`}><span className="partition-id">P{i + 1}</span><div>{group.map((s) => <span className="state-chip" key={s}>{s}</span>)}</div></motion.div>)}</div></div><div className="control-row"><button className="icon-control" disabled={currentStep === 0} onClick={() => setStep(Math.max(0, currentStep - 1))}><StepBack size={18} /> Previous</button><button className="play-control" disabled={!result.steps.length} onClick={() => { if (currentStep >= result.steps.length - 1) { setStep(0); setRunning(true); } else { setRunning(!running); } }}>{running ? <Pause size={18} /> : <Play size={18} />}{running ? 'Pause' : currentStep >= result.steps.length - 1 ? 'Replay' : 'Start'}</button><button className="icon-control" disabled={currentStep >= result.steps.length - 1} onClick={() => setStep(Math.min(result.steps.length - 1, currentStep + 1))}>Next <StepForward size={18} /></button><button className="reset-control" onClick={() => { setStep(0); setRunning(false) }}><RotateCcw size={16} /></button></div></div><div className="panel sim-preview"><div className="panel-title"><span><Layers3 size={18} /> Automaton context</span></div><Diagram dfa={dfa} highlight={current.highlighted} compact /><div className="mini-stat"><span>Original states</span><b>{dfa.states.length}</b></div><div className="mini-stat"><span>Reachable states</span><b>{result.reachable.length}</b></div><div className="mini-stat"><span>Current blocks</span><b>{current.partitions.length}</b></div></div></div><div className="below-actions"><button className="button outline" onClick={() => go('input')}><StepBack size={16} /> Edit DFA</button><button className="button primary" onClick={() => go('result')}>View minimized DFA <ArrowRight size={16} /></button></div></section>}
      {page === 'result' && <Result dfa={dfa} result={result} go={go} />}
      {page === 'testing' && <Testing dfa={dfa} minimized={result.minimized} />}
      {page === 'theory' && <Theory />}
    </main>
    <footer><span className="brand"><span className="brand-mark"><Sparkles size={14} /></span> DFA<span className="gradient-text">.lab</span></span><span>Built for curious automata minds · No backend required</span><button onClick={() => go('theory')}>Theory <ArrowRight size={14} /></button></footer>
  </div>
}

function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string, title: string, subtitle: string }) { return <div className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div> }
function Home({ go, dfa }: { go: (p: Page) => void, dfa: DFA }) { return <><section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="pulse-dot" /> Interactive automata laboratory</span><h1>Make every state<br /><span className="gradient-text">tell a story.</span></h1><p>Explore, visualise and understand DFA minimisation through an elegant, step-by-step simulator made for learning.</p><div className="hero-actions"><button className="button primary large" onClick={() => go('input')}>Start simulation <ArrowRight size={18} /></button><button className="button ghost large" onClick={() => go('simulate')}><CirclePlay size={18} /> Try sample DFA</button></div><div className="hero-meta"><span><Check size={14} /> Real algorithm</span><span><Check size={14} /> No sign-in</span><span><Check size={14} /> Built for students</span></div></div><div className="hero-visual"><div className="glow" /><div className="visual-label"><span className="live-dot" /> Live preview <span>01 / 04</span></div><Diagram dfa={dfa} compact /><div className="visual-footer"><span>sample_automaton.dfa</span><span className="gradient-text">ready</span></div></div></section><section className="feature-section"><div className="section-intro"><span className="eyebrow">THE WORKFLOW</span><h2>From raw states to<br /><span className="gradient-text">minimal clarity.</span></h2></div><div className="feature-grid">{[['01', 'DFA Input', 'Define states, symbols and transitions with a builder that catches mistakes early.', GitBranch], ['02', 'Step-by-step', 'Pause, rewind and inspect every real operation in the minimisation proof.', CirclePlay], ['03', 'Partition refinement', 'See why states split, which states are equivalent, and how the blocks evolve.', Layers3], ['04', 'Minimized DFA', 'Compare both machines and verify they accept exactly the same language.', Sparkles]].map(([num, title, text, Icon]) => <motion.div whileHover={{ y: -5 }} className="feature-card" key={num as string}><span className="feature-num">{num as string}</span><div className="feature-icon"><Icon size={20} /></div><h3>{title as string}</h3><p>{text as string}</p><ArrowRight className="feature-arrow" size={17} /></motion.div>)}</div></section><section className="definition"><div className="definition-mark">δ</div><div><span className="eyebrow">THE BIG IDEA</span><h2>Minimisation is a proof,<br />not just a compression.</h2><p>A minimal DFA has the fewest possible states while accepting exactly the same language. We find it by proving which states are indistinguishable — one partition at a time.</p></div><button className="button outline" onClick={() => go('theory')}>Explore the theory <ArrowRight size={16} /></button></section></> }
function Result({ dfa, result, go }: { dfa: DFA, result: ReturnType<typeof minimizeDFA>, go: (p: Page) => void }) { const removed = dfa.states.filter((s) => !result.reachable.includes(s)); return <section className="page-section"><PageHeading eyebrow="03 / THE RESULT" title="Clarity, minimized." subtitle="The machine below is constructed directly from the final equivalence classes — no hardcoded shortcuts." /><div className="metrics">{[['Original states', dfa.states.length], ['Reachable', result.reachable.length], ['Minimized', result.minimized.states.length], ['Merged away', result.reachable.length - result.minimized.states.length]].map(([label, value]) => <div className="metric" key={label as string}><span>{label as string}</span><b>{value as number}</b></div>)}</div><div className="compare-grid"><div className="panel"><div className="panel-title"><span>Original DFA</span><span className="muted">{dfa.states.length} states</span></div><Diagram dfa={dfa} /></div><div className="merge-arrow"><ArrowRight /></div><div className="panel"><div className="panel-title"><span>Minimized DFA</span><span className="success-text">{result.minimized.states.length} states</span></div><Diagram dfa={result.minimized} /></div></div><div className="result-grid"><div className="panel"><div className="panel-title"><span><Layers3 size={18} /> Equivalence classes</span></div><div className="class-list">{result.partitions.map((p, i) => <div className="class-row" key={i}><span>P{i + 1}</span><b>{p.join(' ≡ ')}</b>{p.length > 1 && <small>merged</small>}</div>)}</div></div><div className="panel"><div className="panel-title"><span><Table2 size={18} /> Final transition table</span></div><Table dfa={result.minimized} /></div></div><div className="below-actions"><button className="button outline" onClick={() => go('testing')}>Test strings <ArrowRight size={16} /></button><button className="button primary" onClick={() => go('simulate')}>Replay simulation <RotateCcw size={16} /></button></div>{removed.length > 0 && <p className="result-note"><Info size={15} /> Unreachable states removed: <b>{removed.join(', ')}</b></p>}</section> }
function runString(dfa: DFA, value: string) {
  const chars = [...value];
  let state = dfa.startState;
  if (!state || !dfa.states.includes(state)) {
    return { accepted: false, path: [], error: 'Start state is not defined or valid.' };
  }
  const path = [state];
  for (const symbol of chars) {
    if (!dfa.alphabet.includes(symbol)) return { accepted: false, path, error: `Symbol "${symbol}" is outside this alphabet.` };
    const nextState = dfa.transitions[state]?.[symbol];
    if (!nextState || !dfa.states.includes(nextState)) {
      return { accepted: false, path, error: `Transition δ(${state}, ${symbol}) is missing or points to an invalid state.` };
    }
    state = nextState;
    path.push(state)
  }
  return { accepted: dfa.finalStates.includes(state), path }
}
function Testing({ dfa, minimized }: { dfa: DFA, minimized: DFA }) { const [input, setInput] = useState('001'); const [tested, setTested] = useState(false); const original = tested ? runString(dfa, input) : null; const reduced = tested ? runString(minimized, input) : null; const comparisons: { label: string, machine: DFA, outcome: ReturnType<typeof runString> | null }[] = [{ label: 'Original DFA', machine: dfa, outcome: original }, { label: 'Minimized DFA', machine: minimized, outcome: reduced }]; return <section className="page-section"><PageHeading eyebrow="04 / STRING LAB" title="Put the machines to work." subtitle="Run the same input through both automata and compare every transition. Empty strings are valid too." /><div className="test-input panel"><div><span className="eyebrow">INPUT STRING</span><div className="string-box"><span>ε</span><input value={input} onChange={(e) => { setInput(e.target.value); setTested(false) }} placeholder="e.g. 00101" /></div><div className="sample-pills">{['', '0', '001', '1010', '111'].map((s) => <button key={s || 'empty'} onClick={() => { setInput(s); setTested(false) }}>{s || 'ε'}</button>)}</div></div><button className="button primary large" onClick={() => setTested(true)}><Play size={18} /> Run test</button></div>{tested ? <div className="test-results">{comparisons.map(({ label, machine, outcome }) => { const r = outcome!; return <div className="panel execution" key={label}><div className="panel-title"><span>{label}</span><strong className={r.error ? 'warning-text' : r.accepted ? 'success-text' : 'danger-text'}>{r.error ? 'INVALID' : r.accepted ? 'ACCEPTED' : 'REJECTED'}</strong></div><div className="path">{r.path.map((state, i) => <span key={`${state}-${i}`}><b>{state}</b>{i < r.path.length - 1 && <em> — {input[i] || 'ε'} → </em>}</span>)}</div>{r.error && <p className="error-inline">{r.error}</p>}<div className="execution-foot"><span>Start: {machine.startState}</span><span>End: {r.path[r.path.length - 1]}</span></div></div> })}</div> : <div className="empty-state"><Sparkles size={28} /><h3>Ready when you are</h3><p>Enter a string and run it to see the complete execution path on both machines.</p></div>}</section> }
function Theory() { const [open, setOpen] = useState<number | null>(null); const qs = [['What is a DFA?', 'A deterministic finite automaton is a five-tuple (Q, Σ, δ, q₀, F) where every state and input symbol pair has exactly one next state.'], ['Why remove unreachable states?', 'An unreachable state can never participate in a computation from q₀, so removing it cannot change the language recognised by the machine.'], ['What makes two states equivalent?', 'Two states are equivalent when no possible suffix can distinguish them: every string leads both to acceptance or both to rejection.'], ['Why are final and non-final states separated first?', 'The empty string distinguishes them immediately. One state accepts ε and the other does not.'], ['What is partition refinement?', 'It repeatedly groups states by the partitions reached by each input symbol. Any group with different signatures is split.'], ['Does minimisation change the language?', 'No. Equivalent states have identical future behaviour, so merging them preserves every accepted and rejected string.'], ['What is the five-tuple?', 'Q is the finite state set, Σ is the alphabet, δ is the transition function, q₀ is the start state and F is the set of final states.'], ['When is a DFA minimal?', 'When it is reachable and no two distinct states are equivalent. The Myhill–Nerode theorem guarantees the result is unique up to renaming.']]; return <section className="page-section theory-page"><PageHeading eyebrow="05 / THEORY DECK" title="The ideas behind the interface." subtitle="A compact field guide for your viva, your presentation, and the next problem set." /><div className="theory-intro"><div className="formula">M = (Q, Σ, δ, q₀, F)</div><p>A deterministic finite automaton maps every state-symbol pair to exactly one state. Minimisation finds the smallest machine with the same behaviour.</p></div><div className="concept-grid">{[['Reachability', 'Trace forward from q₀. Anything you cannot visit is irrelevant.', GitBranch], ['Equivalence', 'Same future for every suffix means same language behaviour.', Layers3], ['Refinement', 'Split a block whenever its states see different destinations.', Table2]].map(([title, text, Icon]) => <div className="concept" key={title as string}><Icon size={20} /><h3>{title as string}</h3><p>{text as string}</p></div>)}</div><div className="faq"><div className="section-intro"><span className="eyebrow">VIVA QUESTIONS</span><h2>Practice the why.</h2></div>{qs.map(([q, a], i) => <button className={`faq-row ${open === i ? 'faq-open' : ''}`} onClick={() => setOpen(open === i ? null : i)} key={q}><span><b>{String(i + 1).padStart(2, '0')}</b>{q}</span>{open === i ? <ChevronDown className="rotate" /> : <ChevronDown />}{open === i && <p>{a}</p>}</button>)}</div></section> }

export default App
