import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import type { CollegesRequest } from '../lib/types';
import { collegeResult, collegesResponse, fakeServer, metaHandler, seedProfile } from '../testkit';

const PHARMACY = collegeResult();
const NEAR = collegeResult({
  id: 'kmtc-11', name: 'Diploma in Community Health Nursing', status: 'near', min_mean: 'B+',
  unmet: [{ kind: 'mean', need: 'B+', have: 'B' }], source: 'Mean Grade C, C in English or Kiswahili',
});
const FAR = collegeResult({
  id: 'tvet-nursing-diploma', provider: 'tvet', name: 'Nursing', category: 'Nursing', status: 'not_eligible', page: 2,
  unmet: [{ kind: 'subject', alternatives: ['CHE'], min_grade: 'A', count: 1 }, { kind: 'overlap' }],
  source: 'Diploma | C (plain) | BIO/Biological Sciences - C (plain)',
});

function serve(response = collegesResponse({ eligible: [PHARMACY], near: [NEAR], not_eligible: [FAR] }), onRequest?: (b: CollegesRequest) => void) {
  return fakeServer({
    ...metaHandler,
    'POST /api/colleges/': (b) => {
      onRequest?.(b as CollegesRequest);
      return response;
    },
  });
}

async function open() {
  window.location.hash = '#/colleges';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Colleges and TVET' });
  return user;
}

describe('colleges and TVET', () => {
  it('is in the main navigation and says how many courses there are', async () => {
    serve();
    await open();
    expect(screen.getByRole('button', { name: 'Colleges and TVET' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText(/36 KMTC courses and 70 TVET programmes/)).toBeInTheDocument();
  });

  it('asks for grades first and sends nothing while the form is incomplete', async () => {
    const { callsTo } = serve();
    await open();
    expect(screen.getByText(/Your grades are not complete yet/)).toBeInTheDocument();
    expect(callsTo('POST /api/colleges/')).toHaveLength(0);
  });

  it('checks the learner automatically and shows the three groups with their counts', async () => {
    seedProfile();
    const requests: CollegesRequest[] = [];
    serve(undefined, (b) => requests.push(b));
    await open();

    expect(await screen.findByRole('tab', { name: /Eligible\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Near miss\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Not eligible\s*1/ })).toBeInTheDocument();
    expect(requests[0]).toMatchObject({ limit: 50, grades: { ENG: 'B', 'MAT A': 'A-' } });
  });

  it('shows an eligible course with its level, requirement, source and the KUCCPS portal note', async () => {
    seedProfile();
    serve();
    await open();
    const card = await screen.findByRole('article', { name: /Diploma in Pharmacy/ });

    expect(card).toHaveTextContent('KMTC · Diploma · Health');
    expect(card).toHaveTextContent('Eligible');
    expect(card).toHaveTextContent('Minimum mean grade C. Yours is B.');
    expect(card).toHaveTextContent('From the KMTC document, page 2');
    expect(card).toHaveTextContent('Mean Grade C, C in English or Kiswahili');
    expect(card).toHaveTextContent('applications are made through the KUCCPS portal');
  });

  it('lists what the course asks for on request, with alternatives labelled', async () => {
    seedProfile();
    serve(collegesResponse({
      eligible: [collegeResult({ options: [
        { label: 'Alternative A', rules: [{ subjects: ['BIO', 'BSC'], grade: 'C', count: 1 }] },
        { label: 'Alternative B', rules: [{ subjects: ['PHY', 'CHE'], grade: 'C-', count: 2 }] },
      ], option: 'Alternative B' })],
    }));
    await open();
    const card = await screen.findByRole('article', { name: /Diploma in Pharmacy/ });
    expect(within(card).getByText('What this course asks for')).toBeInTheDocument();
    expect(card).toHaveTextContent('Alternative A');
    expect(card).toHaveTextContent('Biology or Biological Sciences, at least C');
    expect(card).toHaveTextContent('Any 2 of Physics or Chemistry, at least C-');
    expect(card).toHaveTextContent('Met through Alternative B.');
  });

  it('does not claim a course was met when only its closest option is being reported', async () => {
    seedProfile();
    serve(collegesResponse({ not_eligible: [collegeResult({ status: 'not_eligible', option: 'Alternative A', unmet: [{ kind: 'overlap' }] })] }));
    const user = await open();
    await user.click(await screen.findByRole('tab', { name: /Not eligible/ }));
    expect(screen.getByRole('article')).not.toHaveTextContent('Met through');
  });

  it('does not repeat the category when it is the same as the course name', async () => {
    seedProfile();
    serve();
    const user = await open();
    await user.click(await screen.findByRole('tab', { name: /Not eligible/ }));
    const subtitle = screen.getByRole('article', { name: /Nursing, TVET diploma/ }).querySelector('p')!;
    expect(subtitle.textContent).toBe('TVET · Diploma');
  });

  it('explains a near miss by the exact shortfall', async () => {
    seedProfile();
    serve();
    const user = await open();
    await user.click(await screen.findByRole('tab', { name: /Near miss/ }));
    const card = screen.getByRole('article', { name: /Community Health Nursing/ });
    expect(card).toHaveTextContent('Near miss');
    expect(card).toHaveTextContent('Needs a mean grade of B+; yours is B.');
  });

  it('lists every shortfall for a course that is not met, and gives TVET courses no portal note', async () => {
    seedProfile();
    serve();
    const user = await open();
    await user.click(await screen.findByRole('tab', { name: /Not eligible/ }));
    const card = screen.getByRole('article', { name: /Nursing, TVET diploma/ });
    expect(card).toHaveTextContent('Needs Chemistry, at least A.');
    expect(card).toHaveTextContent('The same subject cannot count for two requirements');
    expect(card).toHaveTextContent('From the TVET document, page 2');
    expect(card).not.toHaveTextContent('KUCCPS portal');
  });

  it('shows warnings, notes and the audience a course is for', async () => {
    seedProfile();
    serve(collegesResponse({ eligible: [collegeResult({
      warnings: ['incomplete_source'], notes: 'The printed row is cut off.', audience: 'visually_or_hearing_impaired',
    })] }));
    await open();
    const card = await screen.findByRole('article');
    expect(card).toHaveTextContent('look cut off in the source document');
    expect(card).toHaveTextContent('The printed row is cut off.');
    expect(card).toHaveTextContent('for visually or hearing impaired applicants');
  });

  it('reads an artisan course as having no minimum, and a course with no printed mean grade as such', async () => {
    seedProfile();
    serve(collegesResponse({ eligible: [
      collegeResult({ id: 'a', name: 'Artisan Plumbing', provider: 'tvet', level: 'artisan', min_mean: 'E', options: [{ label: null, rules: [] }] }),
      collegeResult({ id: 'b', name: 'No Mean Course', min_mean: null, warnings: ['mean_grade_not_stated'] }),
    ] }));
    await open();
    expect(await screen.findByRole('article', { name: /Artisan Plumbing/ })).toHaveTextContent('Minimum mean grade E (no minimum)');
    const none = screen.getByRole('article', { name: /No Mean Course/ });
    expect(none).toHaveTextContent('No minimum mean grade is printed.');
    expect(none).toHaveTextContent('prints no mean grade');
  });

  it('does not offer a requirements list for a course that has none', async () => {
    seedProfile();
    serve(collegesResponse({ eligible: [collegeResult({ options: [{ label: null, rules: [] }] })] }));
    await open();
    const card = await screen.findByRole('article');
    expect(within(card).queryByText('What this course asks for')).not.toBeInTheDocument();
  });

  it('sends provider, level and search filters', async () => {
    seedProfile();
    const requests: CollegesRequest[] = [];
    serve(undefined, (b) => requests.push(b));
    const user = await open();
    await screen.findByRole('tab', { name: /Eligible/ });

    await user.click(screen.getByRole('button', { name: 'KMTC' }));
    await user.click(screen.getByRole('button', { name: 'Certificate' }));
    await user.type(screen.getByLabelText('Search by course'), 'nurs');
    await waitFor(() => expect(requests.at(-1)).toMatchObject({ providers: ['kmtc'], levels: ['certificate'], q: 'nurs' }));

    await user.click(screen.getByRole('button', { name: 'KMTC' }));
    await waitFor(() => expect(requests.at(-1)?.providers).toBeUndefined());
  });

  it('offers more when a group is cut short', async () => {
    seedProfile();
    const requests: CollegesRequest[] = [];
    serve(collegesResponse({ eligible: [PHARMACY] }, { counts: { eligible: 80, near: 0, not_eligible: 0 }, truncated: { eligible: true, near: false, not_eligible: false } }), (b) => requests.push(b));
    const user = await open();
    await user.click(await screen.findByRole('button', { name: /Showing 1 of 80/ }));
    await waitFor(() => expect(requests.at(-1)?.limit).toBe(100));
  });

  it('says when a group is empty', async () => {
    seedProfile();
    serve(collegesResponse({ near: [NEAR] }));
    await open();
    expect(await screen.findByText('No courses in this group.')).toBeInTheDocument();
  });

  it('shows the server\'s message when the check fails', async () => {
    seedProfile();
    fakeServer({ ...metaHandler, 'POST /api/colleges/': () => ({ status: 400, body: { detail: 'Something specific went wrong.' } }) });
    await open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Something specific went wrong.');
  });
});
