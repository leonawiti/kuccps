import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './../App';
import type { EligibilityRequest } from '../lib/types';
import { META, MID_GRADES, eligibility, evaluation, fakeServer, metaHandler, seedProfile } from '../testkit';

const SAFE = evaluation({ code: '101', name: 'BACHELOR OF SCIENCE (NURSING)', band: 'safe' });
const FIT = evaluation({ code: '102', name: 'BACHELOR OF LAWS', institution: 'Beta University', pathway: 'social', band: 'best_fit', cutoff: 38, margin: 0.545, cluster: 38.545 });
const STRETCH = evaluation({ code: '103', name: 'BACHELOR OF MEDICINE', band: 'stretch', margin: -1.2 });
const EXCLUDED = evaluation({ code: '104', name: 'BACHELOR OF ENGINEERING', band: 'excluded', state: 'subjects_not_met', cluster: null, margin: null, cutoff: null,
  failed_slots: [{ alternatives: ['PHY'], min_grade: 'A' }], picks: [] });
const NODATA = evaluation({ code: '105', name: 'BACHELOR OF NEW THING', band: null, state: 'no_cutoff', cluster: null, margin: null, cutoff: null, cutoff_year: null });

const RESULT = eligibility({ best_fit: [FIT], safe: [SAFE], stretch: [STRETCH], excluded: [EXCLUDED], no_data: [NODATA] });

function serve(onEligibility?: (body: EligibilityRequest) => void, result = RESULT) {
  return fakeServer({
    ...metaHandler,
    'POST /api/eligibility/': (body) => {
      onEligibility?.(body as EligibilityRequest);
      return result;
    },
  });
}

async function openChecker() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Check my courses' });
  return user;
}

describe('filling in the grade form', () => {
  it('shows a live total once seven subjects have grades', async () => {
    serve();
    const user = await openChecker();

    expect(screen.getByText('Enter at least 7 subjects with grades (0 so far).')).toBeInTheDocument();

    const picks: [string, string][] = [['ENG', 'B'], ['KIS', 'B+'], ['MAT A', 'A-'], ['BIO', 'B'], ['CHE', 'B+'], ['PHY', 'B'], ['GEO', 'C+']];
    for (let i = 0; i < picks.length; i += 1) {
      if (i >= 3) await user.selectOptions(screen.getByLabelText(`Subject ${i + 1}`), picks[i][0]);
      await user.selectOptions(screen.getByLabelText(`Grade for subject ${i + 1}`), picks[i][1]);
    }
    expect(screen.getByText(/Total of best seven subjects:/).parentElement).toHaveTextContent('65 of 84');
    expect(screen.getByText(/Total of best seven subjects:/).parentElement).toHaveTextContent('Mean grade: B');
  });

  it('will not offer a subject twice', async () => {
    serve();
    const user = await openChecker();
    await user.selectOptions(screen.getByLabelText('Subject 4'), 'BIO');
    expect(within(screen.getByLabelText('Subject 5')).getByRole('option', { name: 'Biology' })).toBeDisabled();
    expect(within(screen.getByLabelText('Subject 4')).getByRole('option', { name: 'Biology' })).not.toBeDisabled();
  });

  it('adds and removes subject rows', async () => {
    serve();
    const user = await openChecker();
    const before = screen.getAllByLabelText(/^Subject \d+$/).length;
    await user.click(screen.getByRole('button', { name: 'Add a subject' }));
    expect(screen.getAllByLabelText(/^Subject \d+$/)).toHaveLength(before + 1);
    await user.click(screen.getByRole('button', { name: 'Remove subject 1' }));
    expect(screen.getAllByLabelText(/^Subject \d+$/)).toHaveLength(before);
  });

  it('stops adding subject rows at twelve', async () => {
    serve();
    const user = await openChecker();
    const add = screen.getByRole('button', { name: 'Add a subject' });
    while (screen.getAllByLabelText(/^Subject \d+$/).length < 12) await user.click(add);
    expect(add).toBeDisabled();
    expect(screen.getAllByLabelText(/^Subject \d+$/)).toHaveLength(12);
  });

  it('keeps the search button off until the form is complete', async () => {
    serve();
    await openChecker();
    expect(screen.getByRole('button', { name: 'Find my courses' })).toBeDisabled();
    expect(screen.getByText('Complete the grade form to continue.')).toBeInTheDocument();
  });

  it('says how many of the lowest subjects are not counted', async () => {
    seedProfile({ ...MID_GRADES, AGR: 'D', CRE: 'E' });
    serve();
    await openChecker();
    expect(await screen.findByText(/Your lowest 2 subjects are not counted/)).toBeInTheDocument();
  });
});

describe('finding courses', () => {
  it('sends the grades and shows the bands with their counts', async () => {
    seedProfile();
    const requests: EligibilityRequest[] = [];
    serve((b) => requests.push(b));
    const user = await openChecker();

    await user.click(screen.getByRole('button', { name: 'Find my courses' }));

    expect(await screen.findByRole('tab', { name: /Best fit\s*1/ })).toBeInTheDocument();
    expect(requests[0]).toMatchObject({ grades: MID_GRADES, mode: 'flexible', limit: 25 });
    for (const [label, n] of [['Best fit', 1], ['Safe', 1], ['Stretch', 1], ['Excluded', 1], ['No cut-off data', 1]] as const) {
      expect(screen.getByRole('tab', { name: new RegExp(`${label}\\s*${n}`) })).toBeInTheDocument();
    }
    expect(screen.getByText(/Total:/).parentElement).toHaveTextContent('65 of 84');
  });

  it('starts on the best fit band and shows its programmes with the numbers', async () => {
    seedProfile();
    serve();
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));

    const card = await screen.findByRole('article', { name: /BACHELOR OF LAWS, Beta University/ });
    expect(card).toHaveTextContent('38.545');
    expect(card).toHaveTextContent('+0.55');
    expect(card).toHaveTextContent('Best fit');
    expect(card).toHaveTextContent('Social Sciences and Humanities');
  });

  it('switches bands and explains why an excluded programme is excluded', async () => {
    seedProfile();
    serve();
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    await user.click(await screen.findByRole('tab', { name: /Excluded/ }));

    const card = screen.getByRole('article', { name: /BACHELOR OF ENGINEERING/ });
    expect(card).toHaveTextContent('A required subject grade is not met');
    expect(card).toHaveTextContent('Physics, at least A');
  });

  it('says plainly when a programme has no cut-off', async () => {
    seedProfile();
    serve();
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    await user.click(await screen.findByRole('tab', { name: /No cut-off data/ }));
    expect(screen.getByRole('article', { name: /BACHELOR OF NEW THING/ })).toHaveTextContent('No cut-off has been published');
  });

  it('shows the warnings the engine raises', async () => {
    seedProfile();
    serve(undefined, eligibility({ safe: [evaluation({ warnings: ['subject_requirements_unknown', 'cluster_subjects_filled'] })] }));
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    await user.click(await screen.findByRole('tab', { name: /Safe/ }));
    expect(screen.getByText(/no subject requirements in our data/)).toBeInTheDocument();
    expect(screen.getByText(/best remaining subjects were used/)).toBeInTheDocument();
  });

  it('shows an empty band as empty', async () => {
    seedProfile();
    serve(undefined, eligibility({ safe: [SAFE] }));
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    expect(await screen.findByText('No programmes in this band.')).toBeInTheDocument();
  });

  it('offers more when a band is cut short, asking for a longer list', async () => {
    seedProfile();
    const requests: EligibilityRequest[] = [];
    const first = eligibility({ best_fit: [FIT] }, { counts: { best_fit: 60, safe: 0, stretch: 0, excluded: 0, no_data: 0 }, truncated: { best_fit: true, safe: false, stretch: false, excluded: false, no_data: false } });
    serve((b) => requests.push(b), first);
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));

    await user.click(await screen.findByRole('button', { name: /Showing 1 of 60/ }));
    await waitFor(() => expect(requests.at(-1)?.limit).toBe(50));
  });

  it('shows the server\'s message when the request is refused', async () => {
    seedProfile();
    fakeServer({ ...metaHandler, 'POST /api/eligibility/': () => ({ status: 400, body: { detail: 'At least 7 different subjects are needed; 2 given.' } }) });
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('At least 7 different subjects');
  });
});

describe('what a programme card shows', () => {
  async function showSafe(result: ReturnType<typeof evaluation>) {
    seedProfile();
    serve(undefined, eligibility({ safe: [result] }));
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    await user.click(await screen.findByRole('tab', { name: /Safe/ }));
    return screen.getByRole('article');
  }

  it('names the subjects that made up the cluster points, with their points', async () => {
    const card = await showSafe(evaluation());
    expect(card).toHaveTextContent('Cluster subjects used: Biology (9), Chemistry (10), Mathematics (Alternative A) (11), Kiswahili (10).');
  });

  it('lists the subject requirements on request', async () => {
    const card = await showSafe(evaluation({ slots: [{ alternatives: ['MAT A', 'PHY'], min_grade: 'C' }] }));
    expect(within(card).getByText('Subject requirements')).toBeInTheDocument();
    expect(card).toHaveTextContent('Mathematics (Alternative A) or Physics, at least C');
  });

  it('says whether the cut-off rose, fell or held against the year before', async () => {
    expect(await showSafe(evaluation({ cutoffs: { '2023': 29, '2024': 30 } }))).toHaveTextContent('Cut-off rose by 1.00 on the year before.');
  });
  it('says when it fell', async () => {
    expect(await showSafe(evaluation({ cutoffs: { '2023': 31.5, '2024': 30 } }))).toHaveTextContent('Cut-off fell by 1.50 on the year before.');
  });
  it('says when it held', async () => {
    expect(await showSafe(evaluation({ cutoffs: { '2023': 30, '2024': 30 } }))).toHaveTextContent('Cut-off unchanged on the year before.');
  });
  it('says nothing about a trend with only one year of data', async () => {
    expect(await showSafe(evaluation({ cutoffs: { '2024': 30 } }))).not.toHaveTextContent('on the year before');
  });
});

describe('narrowing and re-sorting', () => {
  it('asks again with the new band width when the mode changes after a search', async () => {
    seedProfile();
    const requests: EligibilityRequest[] = [];
    serve((b) => requests.push(b));
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    await screen.findByRole('tab', { name: /Best fit/ });

    await user.click(screen.getByRole('radio', { name: /Classic/ }));
    await waitFor(() => expect(requests.at(-1)?.mode).toBe('classic'));
  });

  it('sends search text, a university and a career family as filters', async () => {
    seedProfile();
    const requests: EligibilityRequest[] = [];
    serve((b) => requests.push(b));
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    await screen.findByRole('tab', { name: /Best fit/ });

    await user.type(screen.getByLabelText('Search by name, university or code'), 'law');
    await user.selectOptions(screen.getByLabelText('University'), 'Beta University');
    await user.click(screen.getByRole('button', { name: 'STEM' }));
    await waitFor(() => expect(requests.at(-1)).toMatchObject({ q: 'law', institutions: ['Beta University'], pathways: ['stem'] }));
  });

  it('sends university and career-family preferences with their weights', async () => {
    seedProfile();
    const requests: EligibilityRequest[] = [];
    serve((b) => requests.push(b));
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    await screen.findByRole('tab', { name: /Best fit/ });

    await user.click(screen.getByText(/Preferences \(reorder within each band\)/));
    await user.selectOptions(screen.getByLabelText('Preferred university'), 'Beta University');
    await user.selectOptions(screen.getByLabelText('Weight for Beta University'), '3');
    await user.selectOptions(screen.getByLabelText('STEM'), '1');

    await waitFor(() => expect(requests.at(-1)?.preferences).toEqual({ institutions: { 'Beta University': 3 }, pathways: { stem: 1 } }));

    await user.click(screen.getByRole('button', { name: 'Remove Beta University' }));
    await waitFor(() => expect(requests.at(-1)?.preferences).toEqual({ pathways: { stem: 1 } }));
  });

  it('lists every university the catalogue has', async () => {
    serve();
    await openChecker();
    const options = within(screen.getByLabelText('University')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['All universities', ...META.catalogue.institutions]);
  });
});

describe('adding to my choices', () => {
  it('adds a programme from the results and shows the count on the tab', async () => {
    seedProfile();
    serve();
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    const card = await screen.findByRole('article', { name: /BACHELOR OF LAWS/ });

    await user.click(within(card).getByRole('button', { name: 'Add to my choices' }));

    expect(within(card).getByRole('button', { name: 'Remove from my choices' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My four choices\s*1/ })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('kuccps.choices.v1') ?? '[]')).toEqual([{ code: '102', name: 'BACHELOR OF LAWS', institution: 'Beta University' }]);
  });

  it('stops adding at four', async () => {
    seedProfile();
    const many = ['1', '2', '3', '4', '5'].map((c) => evaluation({ code: c, name: `COURSE ${c}`, band: 'safe' }));
    serve(undefined, eligibility({ safe: many }));
    const user = await openChecker();
    await user.click(screen.getByRole('button', { name: 'Find my courses' }));
    await user.click(await screen.findByRole('tab', { name: /Safe/ }));

    for (const c of ['1', '2', '3', '4']) {
      await user.click(within(screen.getByRole('article', { name: new RegExp(`COURSE ${c}`) })).getByRole('button', { name: 'Add to my choices' }));
    }
    expect(within(screen.getByRole('article', { name: /COURSE 5/ })).getByRole('button', { name: 'Add to my choices' })).toBeDisabled();
  });
});
