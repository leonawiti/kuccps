import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { classResponse, fakeServer, metaHandler } from '../testkit';

const SHEET = 'Name,ENG,KIS,MAT A,BIO,CHE,PHY,GEO\nAmina,B,B+,A-,B,B+,B,C+\nOtieno,D,D,D,D,D,D,D';

async function open() {
  window.location.hash = '#/class';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Class and school analysis' });
  return user;
}

async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(screen.getByLabelText('Or paste the marks here'));
  await user.paste(text);
}

describe('class analysis', () => {
  it('keeps the analyse button off until there is something to analyse', async () => {
    fakeServer(metaHandler);
    await open();
    expect(screen.getByRole('button', { name: 'Analyse the class' })).toBeDisabled();
  });

  it('turns pasted marks into learners, sends them, and shows the class results', async () => {
    const bodies: { learners: { name: string; grades: Record<string, string> }[]; mode: string }[] = [];
    fakeServer({ ...metaHandler, 'POST /api/class/': (b) => { bodies.push(b as never); return classResponse(); } });
    const user = await open();

    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));

    expect(await screen.findByRole('heading', { name: 'Class results' })).toBeInTheDocument();
    expect(bodies[0].mode).toBe('flexible');
    expect(bodies[0].learners[0]).toEqual({ name: 'Amina', grades: { ENG: 'B', KIS: 'B+', 'MAT A': 'A-', BIO: 'B', CHE: 'B+', PHY: 'B', GEO: 'C+' } });
    expect(bodies[0].learners).toHaveLength(2);
  });

  it('shows the headline figures, the charts and who needs support', async () => {
    fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse() });
    const user = await open();
    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    await screen.findByRole('heading', { name: 'Class results' });

    expect(screen.getByText('Learners analysed').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Mean total').parentElement).toHaveTextContent('50.0');
    expect(screen.getByText('With a safe course').parentElement).toHaveTextContent('50%');
    expect(screen.getByText('Need support').parentElement).toHaveTextContent('1');

    expect(screen.getByRole('figure', { name: 'Mean grade (number of learners)' })).toBeInTheDocument();
    const families = screen.getByRole('figure', { name: 'Learners with a reachable course, by career family' });
    expect(within(families).getByText('STEM')).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: 'Average points by subject (out of 12)' })).toHaveTextContent('English');

    const support = screen.getByRole('region', { name: 'Learners who need support' });
    expect(support).toHaveTextContent('Otieno');
  });

  it('sorts the learner table when a column heading is chosen', async () => {
    fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse() });
    const user = await open();
    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    const table = await screen.findByRole('table');

    const order = () => within(table).getAllByRole('rowheader').map((c) => c.textContent);
    expect(order()).toEqual(['Amina', 'Otieno']); // total, highest first
    await user.click(within(table).getByRole('button', { name: /Total/ }));
    expect(order()).toEqual(['Otieno', 'Amina']);
    await user.click(within(table).getByRole('button', { name: /Learner/ }));
    expect(order()).toEqual(['Otieno', 'Amina']); // name, descending first
    expect(within(table).getByRole('columnheader', { name: /Learner/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('marks only the learner who needs support in the table', async () => {
    fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse() });
    const user = await open();
    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    const table = await screen.findByRole('table');
    expect(within(within(table).getByRole('row', { name: /Otieno/ })).getByText('Needs support')).toBeInTheDocument();
    expect(within(within(table).getByRole('row', { name: /Amina/ })).queryByText('Needs support')).not.toBeInTheDocument();
  });

  it('reports a file it cannot read without calling the server', async () => {
    const { callsTo } = fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse() });
    const user = await open();
    await paste(user, 'Name,Adm\nZed,1');
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No subject columns found');
    expect(callsTo('POST /api/class/')).toHaveLength(0);
  });

  it('warns about columns it ignored but still analyses the rest', async () => {
    fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse() });
    const user = await open();
    await paste(user, 'Name,Adm,ENG,KIS,MAT A,BIO,CHE,PHY,GEO\nAmina,12,B,B,B,B,B,B,B');
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    expect(await screen.findByText('Column "Adm" is not a known subject and was ignored.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Class results' })).toBeInTheDocument();
  });

  it('lists learners the server could not read', async () => {
    fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse({ rejected: [{ name: 'Few', error: 'At least 7 different subjects are needed; 2 given.' }] }) });
    const user = await open();
    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    expect(await screen.findByText(/Few \(At least 7 different subjects are needed; 2 given\.\)/)).toBeInTheDocument();
  });

  it('shows the server\'s message when the class is refused', async () => {
    fakeServer({ ...metaHandler, 'POST /api/class/': () => ({ status: 400, body: { detail: 'A class can have at most 300 learners; 301 given.' } }) });
    const user = await open();
    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at most 300 learners');
  });

  it('says so when nobody needs support', async () => {
    const base = classResponse();
    fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse({ cohort: { ...base.cohort, at_risk: [] } }) });
    const user = await open();
    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    expect(await screen.findByText(/Every learner has at least one safe or best-fit degree programme/)).toBeInTheDocument();
  });

  it('prints the results', async () => {
    fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse() });
    const user = await open();
    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    await user.click(await screen.findByRole('button', { name: 'Print' }));
    expect(window.print).toHaveBeenCalled();
  });

  it('offers a template and a CSV of the results without failing where downloads are not possible', async () => {
    fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse() });
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Download a template' }));
    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    await user.click(await screen.findByRole('button', { name: 'Download as CSV' }));
    expect(screen.getByRole('heading', { name: 'Class results' })).toBeInTheDocument();
  });

  it('reads an uploaded file', async () => {
    const bodies: unknown[] = [];
    fakeServer({ ...metaHandler, 'POST /api/class/': (b) => { bodies.push(b); return classResponse(); } });
    const user = await open();
    const file = new File([SHEET], 'marks.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('Upload a CSV file'), file);
    expect(await screen.findByDisplayValue(/Amina,B,B\+/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    await screen.findByRole('heading', { name: 'Class results' });
    expect(bodies).toHaveLength(1);
  });

  it('uses the class name in the heading', async () => {
    fakeServer({ ...metaHandler, 'POST /api/class/': () => classResponse() });
    const user = await open();
    await user.type(screen.getByLabelText('Class or school name (for the printout)'), 'Form 4 East');
    await paste(user, SHEET);
    await user.click(screen.getByRole('button', { name: 'Analyse the class' }));
    expect(await screen.findByRole('heading', { name: 'Form 4 East: Class results' })).toBeInTheDocument();
  });
});
