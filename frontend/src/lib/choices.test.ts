import { describe, expect, it } from 'vitest';
import { addChoice, moveChoice, removeChoice } from './choices';

const c = (code: string) => ({ code, name: `Course ${code}`, institution: 'U' });
const codes = (list: { code: string }[]) => list.map((x) => x.code);

describe('addChoice', () => {
  it('appends a new choice', () => {
    expect(codes(addChoice([c('1')], c('2')))).toEqual(['1', '2']);
  });
  it('ignores one already on the list', () => {
    expect(codes(addChoice([c('1')], c('1')))).toEqual(['1']);
  });
  it('stops at four', () => {
    const four = [c('1'), c('2'), c('3'), c('4')];
    expect(codes(addChoice(four, c('5')))).toEqual(['1', '2', '3', '4']);
  });
  it('does not change the list it was given', () => {
    const list = [c('1')];
    addChoice(list, c('2'));
    expect(codes(list)).toEqual(['1']);
  });
});

describe('removeChoice', () => {
  it('removes by code and ignores an unknown code', () => {
    expect(codes(removeChoice([c('1'), c('2')], '1'))).toEqual(['2']);
    expect(codes(removeChoice([c('1')], '9'))).toEqual(['1']);
  });
});

describe('moveChoice', () => {
  const list = [c('1'), c('2'), c('3')];
  it('moves a choice up or down one place', () => {
    expect(codes(moveChoice(list, '2', -1))).toEqual(['2', '1', '3']);
    expect(codes(moveChoice(list, '2', 1))).toEqual(['1', '3', '2']);
  });
  it('does nothing at the ends or for an unknown code', () => {
    expect(codes(moveChoice(list, '1', -1))).toEqual(['1', '2', '3']);
    expect(codes(moveChoice(list, '3', 1))).toEqual(['1', '2', '3']);
    expect(codes(moveChoice(list, '9', 1))).toEqual(['1', '2', '3']);
  });
});
