import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import type { ChoicesRequest } from '../lib/types';
import { MID_GRADES, choicesResponse, evaluation, fakeServer, metaHandler, programme, seedChoices, seedProfile } from '../testkit';

const C1 = { code: '101', name: 'BACHELOR OF SCIENCE (NURSING)', institution: 'Alpha University' };
const C2 = { code: '102', name: 'BACHELOR OF LAWS', institution: 'Beta University' };

async function open(hash = '#/choices') {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'My four choices' });
  return user;
}

const r1 = evaluation({ code: '101', name: C1.name, band: 'safe' });
const r2 = evaluation({ code: '102', name: C2.name, institution: 'Beta University', band: 'stretch', margin: -1, cutoff: 40 });

describe('my four choices', () => {
  it('asks for grades first when the form is not complete', async () => {
    fakeServer(metaHandler);
    await open();
    expect(screen.getByText(/Your grades are not complete yet/)).toBeInTheDocument();
    expect(screen.getByText(/No choices yet/)).toBeInTheDocument();
  });

  it('analyses the list in order and shows each choice\'s band and the advice', async () => {
    seedProfile();
    seedChoices([C1, C2]);
    const requests: ChoicesRequest[] = [];
    fakeServer({
      ...metaHandler,
      'POST /api/choices/': (body) => {
        requests.push(body as ChoicesRequest);
        return choicesResponse([r1, r2], [{ code: 'fewer_than_four', message: 'Only 2 of 4 choices are used.' }]);
      },
    });
    await open();

    const first = await screen.findByRole('article', { name: /NURSING/ });
    expect(first).toHaveTextContent('Safe');
    expect(screen.getByRole('article', { name: /LAWS/ })).toHaveTextContent('Stretch');
    expect(screen.getByText('Only 2 of 4 choices are used.')).toBeInTheDocument();
    expect(requests[0]).toMatchObject({ grades: MID_GRADES, mode: 'flexible', choices: ['101', '102'] });
    expect(screen.getByRole('heading', { name: 'Your list (2 of 4)' })).toBeInTheDocument();
  });

  it('says the list is balanced when there is no advice', async () => {
    seedProfile();
    seedChoices([C1]);
    fakeServer({ ...metaHandler, 'POST /api/choices/': () => choicesResponse([r1]) });
    await open();
    expect(await screen.findByText(/This is a balanced list/)).toBeInTheDocument();
  });

  it('reorders, and asks again with the new order', async () => {
    seedProfile();
    seedChoices([C1, C2]);
    const requests: ChoicesRequest[] = [];
    fakeServer({
      ...metaHandler,
      'POST /api/choices/': (body) => {
        requests.push(body as ChoicesRequest);
        return choicesResponse([r1, r2]);
      },
    });
    const user = await open();
    await screen.findByRole('article', { name: /NURSING/ });

    await user.click(screen.getByRole('button', { name: `Move ${C1.name} down` }));
    await waitFor(() => expect(requests.at(-1)?.choices).toEqual(['102', '101']));
    expect(screen.getByRole('button', { name: `Move ${C2.name} up` })).toBeDisabled();
  });

  it('does not ask the server anything while the list is empty', async () => {
    seedProfile();
    const { callsTo } = fakeServer({ ...metaHandler, 'POST /api/choices/': () => choicesResponse([]) });
    await open();
    expect(callsTo('POST /api/choices/')).toHaveLength(0);
  });

  it('cannot move the first choice up or the last one down', async () => {
    seedProfile();
    seedChoices([C1, C2]);
    fakeServer({ ...metaHandler, 'POST /api/choices/': () => choicesResponse([r1, r2]) });
    await open();
    await screen.findByRole('article', { name: /NURSING/ });
    expect(screen.getByRole('button', { name: `Move ${C1.name} up` })).toBeDisabled();
    expect(screen.getByRole('button', { name: `Move ${C2.name} down` })).toBeDisabled();
    expect(screen.getByRole('button', { name: `Move ${C1.name} down` })).toBeEnabled();
    expect(screen.getByRole('button', { name: `Move ${C2.name} up` })).toBeEnabled();
  });

  it('removes a choice from its card', async () => {
    seedProfile();
    seedChoices([C1, C2]);
    fakeServer({ ...metaHandler, 'POST /api/choices/': (b) => choicesResponse(((b as ChoicesRequest).choices).map((c) => (c === '101' ? r1 : r2))) });
    const user = await open();
    const card = await screen.findByRole('article', { name: /NURSING/ });
    await user.click(within(card).getByRole('button', { name: 'Remove from my choices' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: /NURSING/ })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Your list (1 of 4)' })).toBeInTheDocument();
  });

  it('clears the whole list', async () => {
    seedProfile();
    seedChoices([C1]);
    fakeServer({ ...metaHandler, 'POST /api/choices/': () => choicesResponse([r1]) });
    const user = await open();
    await screen.findByRole('article', { name: /NURSING/ });
    await user.click(screen.getByRole('button', { name: 'Clear list' }));
    expect(await screen.findByText(/No choices yet/)).toBeInTheDocument();
  });

  it('searches for programmes and adds one', async () => {
    seedProfile();
    const queries: string[] = [];
    fakeServer({
      ...metaHandler,
      'GET /api/programmes/': (_b, url) => {
        queries.push(url.search);
        return { total: 1, results: [programme({ code: '102', name: 'BACHELOR OF LAWS', institution: 'Beta University' })] };
      },
      'POST /api/choices/': () => choicesResponse([r2]),
    });
    const user = await open();

    await user.type(screen.getByLabelText('Search programmes'), 'laws');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: 'Add BACHELOR OF LAWS, Beta University' }));

    expect(queries[0]).toBe('?q=laws&limit=8');
    expect(await screen.findByRole('button', { name: 'Added BACHELOR OF LAWS, Beta University' })).toBeDisabled();
    expect(await screen.findByRole('article', { name: /LAWS/ })).toBeInTheDocument();
  });

  it('says when a search finds nothing, and when it fails', async () => {
    seedProfile();
    let fail = false;
    fakeServer({ ...metaHandler, 'GET /api/programmes/': () => (fail ? { status: 500, body: { detail: 'Server error' } } : { total: 0, results: [] }) });
    const user = await open();
    await user.type(screen.getByLabelText('Search programmes'), 'zzz');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('No programmes match this search.')).toBeInTheDocument();

    fail = true;
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
  });

  it('will not add a fifth programme', async () => {
    seedProfile();
    const four = ['1', '2', '3', '4'].map((c) => ({ code: c, name: `COURSE ${c}`, institution: 'U' }));
    seedChoices(four);
    fakeServer({
      ...metaHandler,
      'POST /api/choices/': () => choicesResponse(four.map((c) => evaluation({ code: c.code, name: c.name }))),
      'GET /api/programmes/': () => ({ total: 1, results: [programme({ code: '9', name: 'EXTRA', institution: 'U' })] }),
    });
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('button', { name: 'Add EXTRA, U' })).toBeDisabled();
    expect(screen.getByText(/You have 4 choices/)).toBeInTheDocument();
  });

  it('shows the server\'s message when the choices cannot be checked', async () => {
    seedProfile();
    seedChoices([C1]);
    fakeServer({ ...metaHandler, 'POST /api/choices/': () => ({ status: 400, body: { choices: ['Unknown programme code: 101'] } }) });
    await open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown programme code: 101');
  });

  it('goes to the report from the list', async () => {
    seedProfile();
    seedChoices([C1]);
    fakeServer({ ...metaHandler, 'POST /api/choices/': () => choicesResponse([r1]) });
    const user = await open();
    await screen.findByRole('article', { name: /NURSING/ });
    await user.click(screen.getByRole('button', { name: 'Make my report' }));
    expect(window.location.hash).toBe('#/report');
  });
});
