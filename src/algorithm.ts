export type DFA = {
  states: string[]
  alphabet: string[]
  startState: string
  finalStates: string[]
  transitions: Record<string, Record<string, string>>
}

export type SimulationStep = {
  title: string
  description: string
  partitions: string[][]
  highlighted?: string[]
  phase: string
}

export function validateDFA(dfa: DFA): string[] {
  const errors: string[] = []
  const stateSet = new Set(dfa.states)
  if (!dfa.states.length) errors.push('Add at least one state.')
  if (!dfa.alphabet.length) errors.push('Add at least one input symbol.')
  if (!stateSet.has(dfa.startState)) errors.push(`Start state "${dfa.startState}" does not exist.`)
  dfa.finalStates.forEach((state) => { if (!stateSet.has(state)) errors.push(`Final state "${state}" does not exist.`) })
  dfa.states.forEach((state) => dfa.alphabet.forEach((symbol) => {
    const target = dfa.transitions[state]?.[symbol]
    if (!target) errors.push(`Missing transition: δ(${state}, ${symbol}).`)
    else if (!stateSet.has(target)) errors.push(`Transition δ(${state}, ${symbol}) points to unknown state "${target}".`)
  }))
  return errors
}

export function reachableStates(dfa: DFA): string[] {
  if (!dfa.states.length) return []
  const start = dfa.states.includes(dfa.startState) ? dfa.startState : dfa.states[0]
  if (!start) return []
  const seen = new Set<string>([start])
  const queue = [start]
  while (queue.length) {
    const state = queue.shift()!
    dfa.alphabet.forEach((symbol) => {
      const next = dfa.transitions[state]?.[symbol]
      if (next && dfa.states.includes(next) && !seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    })
  }
  return dfa.states.filter((state) => seen.has(state))
}

export function minimizeDFA(input: DFA) {
  if (!input.states.length || !input.alphabet.length) {
    const fallbackDFA: DFA = {
      states: input.states,
      alphabet: input.alphabet,
      startState: input.startState || '',
      finalStates: input.finalStates,
      transitions: {}
    }
    return {
      minimized: fallbackDFA,
      reachable: [],
      partitions: [],
      steps: [{
        title: 'Incomplete DFA',
        description: 'Define states and alphabet symbols to start minimisation.',
        partitions: [],
        phase: 'Ready'
      }]
    }
  }

  const reachable = reachableStates(input)
  if (!reachable.length) {
    const fallbackDFA: DFA = {
      states: input.states,
      alphabet: input.alphabet,
      startState: input.startState || '',
      finalStates: input.finalStates,
      transitions: {}
    }
    return {
      minimized: fallbackDFA,
      reachable: [],
      partitions: [],
      steps: [{
        title: 'No reachable states',
        description: 'Ensure the start state is valid and belongs to the defined states.',
        partitions: [],
        phase: 'Ready'
      }]
    }
  }

  const activeStartState = reachable.includes(input.startState) ? input.startState : reachable[0]
  const active: DFA = {
    ...input,
    states: reachable,
    startState: activeStartState,
    finalStates: input.finalStates.filter((s) => reachable.includes(s))
  }
  let partitions = [
    active.states.filter((s) => active.finalStates.includes(s)),
    active.states.filter((s) => !active.finalStates.includes(s))
  ].filter((p) => p.length)

  if (!partitions.length) {
    partitions = [active.states]
  }

  const steps: SimulationStep[] = [
    { title: 'Analyse reachable states', description: `Starting at ${active.startState}, follow every transition. ${reachable.length} of ${input.states.length} states can be visited.`, partitions: [reachable], phase: 'Reachability' },
    { title: 'Remove unreachable states', description: input.states.length === reachable.length ? 'Every state is reachable, so no state is removed.' : `Removed ${input.states.filter((s) => !reachable.includes(s)).join(', ')} because no input string can reach them.`, partitions: [reachable], phase: 'Reachability' },
    { title: 'Create initial partitions', description: 'Final and non-final states cannot be equivalent: the empty string already distinguishes them.', partitions: partitions.map((p) => [...p]), phase: 'Initial split' }
  ]
  let changed = true
  while (changed) {
    changed = false
    const nextPartitions: string[][] = []
    const signatures = new Map<string, string[]>()
    partitions.forEach((group) => {
      group.forEach((state) => {
        const signature = active.alphabet.map((symbol) => {
          const target = active.transitions[state]?.[symbol]
          return target ? partitions.findIndex((p) => p.includes(target)) : -1
        }).join('|')
        const key = `${partitions.indexOf(group)}:${signature}`
        signatures.set(key, [...(signatures.get(key) ?? []), state])
      })
    })
    partitions.forEach((group, groupIndex) => {
      const chunks = [...signatures.entries()].filter(([key]) => key.startsWith(`${groupIndex}:`)).map(([, value]) => value)
      nextPartitions.push(...chunks)
      if (chunks.length > 1) {
        changed = true
        steps.push({ title: 'Split distinguishable states', description: `States in {${group.join(', ')}} have different destination partitions for at least one symbol, so they must be separated.`, partitions: nextPartitions.concat(partitions.slice(groupIndex + 1).map((p) => [...p])), highlighted: group, phase: 'Refinement' })
      }
    })
    partitions = nextPartitions
  }
  steps.push({ title: 'Equivalent states identified', description: partitions.filter((p) => p.length > 1).length ? 'States in the same block respond identically to every possible suffix.' : 'No further states can be merged.', partitions: partitions.map((p) => [...p]), phase: 'Equivalence' })
  steps.push({ title: 'Construct minimized DFA', description: `Merge each partition into one state. The result has ${partitions.length} states.`, partitions: partitions.map((p) => [...p]), phase: 'Complete' })

  const name = (group: string[] | undefined) => (group && group.length) ? group.join(' / ') : ''
  const startPartition = partitions.find((p) => p.includes(active.startState)) ?? partitions[0]
  const minimized: DFA = {
    states: partitions.map(name).filter(Boolean),
    alphabet: active.alphabet,
    startState: startPartition ? name(startPartition) : '',
    finalStates: partitions.filter((p) => p.some((s) => active.finalStates.includes(s))).map(name),
    transitions: {}
  }
  partitions.forEach((group) => {
    const groupName = name(group)
    if (!groupName) return
    minimized.transitions[groupName] = {}
    active.alphabet.forEach((symbol) => {
      const target = active.transitions[group[0]]?.[symbol]
      const targetPartition = target ? partitions.find((p) => p.includes(target)) : undefined
      const resolvedTarget = targetPartition ? name(targetPartition) : (startPartition ? name(startPartition) : groupName)
      minimized.transitions[groupName][symbol] = resolvedTarget
    })
  })
  return { minimized, reachable, partitions, steps }
}
