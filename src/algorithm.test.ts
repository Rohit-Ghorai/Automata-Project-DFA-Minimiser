import { describe, expect, it } from 'vitest'
import { minimizeDFA, reachableStates, validateDFA } from './algorithm'

const dfa = { states: ['a', 'b', 'dead'], alphabet: ['0', '1'], startState: 'a', finalStates: ['a', 'b'], transitions: { a: { '0': 'b', '1': 'a' }, b: { '0': 'b', '1': 'a' }, dead: { '0': 'dead', '1': 'dead' } } }
describe('DFA minimisation', () => {
  it('validates complete transitions', () => expect(validateDFA(dfa)).toEqual([]))
  it('finds reachable states', () => expect(reachableStates(dfa)).toEqual(['a', 'b']))
  it('merges equivalent states and removes unreachable states', () => {
    const result = minimizeDFA(dfa)
    expect(result.reachable).toEqual(['a', 'b'])
    expect(result.minimized.states).toHaveLength(1)
    expect(result.partitions.some((group) => group.length > 1)).toBe(true)
  })
  it('safely handles empty or partially erased DFA without crashing', () => {
    const emptyDfa = { states: [], alphabet: ['0', '1'], startState: '', finalStates: [], transitions: {} }
    expect(() => minimizeDFA(emptyDfa)).not.toThrow()
    const brokenDfa = { states: ['q0'], alphabet: ['0', '1'], startState: 'q0', finalStates: [], transitions: { q0: { '0': 'q1', '1': 'deleted' } } }
    expect(() => minimizeDFA(brokenDfa)).not.toThrow()
  })
})
