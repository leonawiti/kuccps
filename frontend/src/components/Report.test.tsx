import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { EligibilityRequest } from '../lib/types';
import { META, choicesResponse, eligibility, evaluation, fakeServer, metaHandler, seedChoices, seedProfile } from '../testkit';

const FIT = evaluation({ code: '102', name: 'BACHELOR OF LAWS', institution: 'Beta University', pathway: 'social', band: 'best_fit', cutoff: 38, margin: 0.545 });
const SAFE = evaluation({ code: '101', name: 'BACHELOR OF SCIENCE (NURSING)', band: 'safe' });
const STRETCH = evaluation({ code: '103', name: 'BACHELOR OF MEDICINE', band: 'stretch', margin: -1.2, cutoff: 39.7 });

function serve(pathwayCalls: EligibilityRequest[] = []) {
  return fakeServer({
    ...metaHandler,
    'POST /api/eligibility/': (b) => {
      const body = b as EligibilityRequest;
      if (body.pathways) {
        pathwayCalls.push(body);
        return body.pathways[0] === 'stem'
          ? eligibility({ safe: [SAFE] }, { counts: { best_fit: 0, safe: 7, stretch: 1, excluded: 0, no_data: 0 } as never })
          : eligibility();
      }
      return eligibility({ best_fit: [FIT], safe: [SAFE], stretch: [STRETCH] });
    },
    'POST /api/choices/': () => choicesResponse([SAFE, STRETCH], [{ code: 'fewer_than_four', message: 'Only 2 of 4 choices are used.' }]),
  });
}

async function open() {
  window.location.hash = '#/report';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Learner report' });
  return user;
}

describe('learner report', () => {
  it('asks for grades first when they are not complete', async () => {
    fakeServer(metaHandler);
    await open();
    expect(screen.getByText(/Your grades are not complete yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print or save as PDF' })).not.toBeInTheDocument();
  });

  it('shows the learner, their results and the totals', async () => {
    seedProfile(undefined, { name: 'Amina Wanjiru', school: 'Moi Girls' });
    serve();
    await open();
    const report = await screen.findByRole('article', { name: 'Learner report' });

    expect(within(report).getByRole('heading', { name: 'Amina Wanjiru' })).toBeInTheDocument();
    expect(report).toHaveTextContent('Moi Girls');
    const results = within(report).getByRole('region', { name: 'KCSE results' });
    expect(results).toHaveTextContent('Total of best seven subjects: 65 of 84');
    expect(results).toHaveTextContent('Mean grade: B');
    // Highest points first, and only the best seven are counted.
    const rows = within(results).getAllByRole('row').slice(1).map((r) => r.textContent);
    expect(rows[0]).toContain('Mathematics (Alternative A)');
  });

  it('counts only the best seven subjects when there are more', async () => {
    seedProfile({ ENG: 'B', KIS: 'B+', 'MAT A': 'A-', BIO: 'B', CHE: 'B+', PHY: 'B', GEO: 'C+', AGR: 'D' });
    serve();
    await open();
    const results = await screen.findByRole('region', { name: 'KCSE results' });
    const agr = within(results).getByRole('row', { name: /Agriculture/ });
    expect(agr).toHaveTextContent('No');
    expect(within(results).getByRole('row', { name: /Biology/ })).toHaveTextContent('Yes');
  });

  it('lists the four choices with their bands and the advice', async () => {
    seedProfile();
    seedChoices([{ code: '101', name: SAFE.name, institution: 'Alpha University' }, { code: '103', name: STRETCH.name, institution: 'Alpha University' }]);
    serve();
    await open();
    const choices = await screen.findByRole('region', { name: 'The four choices' });
    expect(choices).toHaveTextContent('1. BACHELOR OF SCIENCE (NURSING)');
    expect(choices).toHaveTextContent('2. BACHELOR OF MEDICINE');
    expect(choices).toHaveTextContent('Safe');
    expect(choices).toHaveTextContent('Stretch');
    expect(choices).toHaveTextContent('Only 2 of 4 choices are used.');
  });

  it('leaves the choices section out, and says so, when none are picked', async () => {
    seedProfile();
    serve();
    await open();
    await screen.findByRole('article', { name: 'Learner report' });
    expect(screen.queryByRole('region', { name: 'The four choices' })).not.toBeInTheDocument();
    expect(screen.getByText(/No choices have been picked yet/)).toBeInTheDocument();
  });

  it('lists the best fit, safe and stretch courses with their numbers', async () => {
    seedProfile();
    serve();
    await open();
    const fit = await screen.findByRole('region', { name: /Best fit courses/ });
    expect(fit).toHaveTextContent('BACHELOR OF LAWS, Beta University');
    expect(fit).toHaveTextContent('cut-off 38.000 (2024)');
    expect(fit).toHaveTextContent('margin +0.55');
    expect(screen.getByRole('region', { name: /Stretch courses/ })).toHaveTextContent('margin -1.20');
  });

  it('summarises each career family with counts and its top courses', async () => {
    seedProfile();
    const pathwayCalls: EligibilityRequest[] = [];
    serve(pathwayCalls);
    await open();
    const families = await screen.findByRole('region', { name: 'Career families' });

    const stem = within(families).getByRole('row', { name: /STEM/ });
    expect(stem).toHaveTextContent('7'); // safe count for STEM
    expect(within(families).getByText('STEM: top courses')).toBeInTheDocument();
    expect(pathwayCalls.map((c) => c.pathways)).toEqual([['stem'], ['social'], ['arts_sports']]);
  });

  it('asks for six courses overall and three per career family, and shows no more than that', async () => {
    seedProfile();
    const requests: EligibilityRequest[] = [];
    const many = ['1', '2', '3', '4', '5'].map((c) => evaluation({ code: `s${c}`, name: `STEM COURSE ${c}`, band: 'safe' }));
    fakeServer({
      ...metaHandler,
      'POST /api/eligibility/': (b) => {
        const body = b as EligibilityRequest;
        requests.push(body);
        return body.pathways?.[0] === 'stem' ? eligibility({ safe: many }) : eligibility();
      },
    });
    await open();
    const families = await screen.findByRole('region', { name: 'Career families' });

    expect(requests.find((r) => !r.pathways)?.limit).toBe(6);
    expect(requests.filter((r) => r.pathways).map((r) => r.limit)).toEqual([3, 3, 3]);
    expect(within(families).getAllByText(/STEM COURSE/)).toHaveLength(3);
  });

  it('lists best fit courses before safe ones within a career family', async () => {
    seedProfile();
    fakeServer({
      ...metaHandler,
      'POST /api/eligibility/': (b) => ((b as EligibilityRequest).pathways?.[0] === 'social' ? eligibility({ best_fit: [FIT], safe: [SAFE] }) : eligibility()),
    });
    await open();
    const families = await screen.findByRole('region', { name: 'Career families' });
    const text = families.textContent ?? '';
    expect(text.indexOf('BACHELOR OF LAWS')).toBeGreaterThan(-1);
    expect(text.indexOf('BACHELOR OF LAWS')).toBeLessThan(text.indexOf('BACHELOR OF SCIENCE (NURSING)'));
  });

  it('calls the learner "Learner" when no name was given', async () => {
    seedProfile();
    serve();
    await open();
    const report = await screen.findByRole('article', { name: 'Learner report' });
    expect(within(report).getByRole('heading', { level: 2, name: 'Learner' })).toBeInTheDocument();
  });

  it('keeps the print button off until the report is ready', async () => {
    seedProfile();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => (
      String(input).includes('/api/meta/') ? new Response(JSON.stringify(META)) : new Promise<Response>(() => {})
    )));
    window.location.hash = '#/report';
    render(<App />);
    expect(await screen.findByText('Preparing the report...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print or save as PDF' })).toBeDisabled();
  });

  it('explains how to read it, including the caveats', async () => {
    seedProfile();
    serve();
    await open();
    const notes = await screen.findByRole('region', { name: 'How to read this report' });
    expect(notes).toHaveTextContent('not an official placement');
    expect(notes).toHaveTextContent('averages of earlier years');
  });

  it('prints', async () => {
    seedProfile();
    serve();
    const user = await open();
    await user.click(await screen.findByRole('button', { name: 'Print or save as PDF' }));
    expect(window.print).toHaveBeenCalled();
  });

  it('shows the server\'s message if the report cannot be prepared', async () => {
    seedProfile();
    fakeServer({ ...metaHandler, 'POST /api/eligibility/': () => ({ status: 503, body: { detail: 'build the catalogue' } }) });
    await open();
    expect(await screen.findByRole('alert')).toHaveTextContent('build the catalogue');
  });
});
