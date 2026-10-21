import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { META, fakeServer, metaHandler, seedProfile } from './testkit';

describe('starting up', () => {
  it('explains when the server is not ready and lets the person try again', async () => {
    let calls = 0;
    fakeServer({
      'GET /api/meta/': () => (++calls === 1 ? { status: 503, body: { detail: 'degrees.json not found. Run: python manage.py build_catalogue' } } : META),
    });
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('build_catalogue');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Check my courses' })).toBeInTheDocument();
  });

  it('shows the main sections and opens on the course check', async () => {
    fakeServer(metaHandler);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Check my courses' })).toBeInTheDocument();
    for (const name of ['Check my courses', 'My four choices', 'Colleges and TVET', 'Class analysis', 'Report', 'About']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Check my courses' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens the screen named in the address', async () => {
    window.location.hash = '#/about';
    fakeServer(metaHandler);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'About this tool' })).toBeInTheDocument();
  });

  it('moves between screens and puts the screen in the address', async () => {
    fakeServer(metaHandler);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Check my courses' });

    await user.click(screen.getByRole('button', { name: 'Class analysis' }));
    expect(screen.getByRole('heading', { name: 'Class and school analysis' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/class');
  });
});

describe('remembering the learner', () => {
  it('brings back grades from an earlier visit and shows the total', async () => {
    seedProfile();
    fakeServer(metaHandler);
    render(<App />);
    expect(await screen.findByText(/Total of best seven subjects:/)).toBeInTheDocument();
    expect(screen.getByText(/65/)).toBeInTheDocument();
  });

  it('starts fresh when what was stored is not a valid learner', async () => {
    localStorage.setItem('kuccps.profile.v1', '{"nope":1}');
    fakeServer(metaHandler);
    render(<App />);
    await screen.findByRole('heading', { name: 'Check my courses' });
    expect(screen.getByLabelText('Subject 1')).toHaveValue('ENG');
    expect(screen.getByLabelText('Grade for subject 1')).toHaveValue('');
  });

  it('drops a stored subject the server no longer knows, so it is not counted', async () => {
    seedProfile({ ENG: 'B', OLDSUBJECT: 'A' });
    fakeServer(metaHandler);
    render(<App />);
    await screen.findByRole('heading', { name: 'Check my courses' });
    expect(screen.getByText('Enter at least 7 subjects with grades (1 so far).')).toBeInTheDocument();
  });

  it('ignores a stored learner whose mode or name is not valid', async () => {
    const rows = [{ subject: 'ENG', grade: 'B' }];
    for (const bad of [{ name: '', school: '', rows, mode: 'wild' }, { name: 5, school: '', rows, mode: 'flexible' }]) {
      localStorage.setItem('kuccps.profile.v1', JSON.stringify(bad));
      fakeServer(metaHandler);
      const { unmount } = render(<App />);
      await screen.findByRole('heading', { name: 'Check my courses' });
      expect(screen.getByLabelText('Grade for subject 1')).toHaveValue('');
      unmount();
    }
  });

  it('keeps what is typed so a refresh does not lose it', async () => {
    fakeServer(metaHandler);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Check my courses' });
    await user.type(screen.getByLabelText('Name (optional)'), 'Amina');
    await waitFor(() => expect(JSON.parse(localStorage.getItem('kuccps.profile.v1') ?? '{}').name).toBe('Amina'));
  });

  it('still works when the browser will not let it store anything', async () => {
    fakeServer(metaHandler);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
    try {
      const user = userEvent.setup();
      render(<App />);
      await screen.findByRole('heading', { name: 'Check my courses' });
      await user.type(screen.getByLabelText('Name (optional)'), 'A');
      expect(screen.getByLabelText('Name (optional)')).toHaveValue('A');
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe('theme', () => {
  it('cycles device, light and dark and sets the page to match', async () => {
    fakeServer(metaHandler);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Check my courses' });

    await user.click(screen.getByRole('button', { name: 'Theme: device' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await user.click(screen.getByRole('button', { name: 'Theme: light' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByRole('button', { name: 'Theme: dark' }));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});

describe('about', () => {
  it('states the assumptions and where the data comes from', async () => {
    window.location.hash = '#/about';
    fakeServer(metaHandler);
    render(<App />);
    expect(await screen.findByText(/draft workbook of 5 degree programmes at 2 institutions/)).toBeInTheDocument();
    expect(screen.getByText(/not a live KUCCPS feed/)).toBeInTheDocument();
    expect(screen.getByText(/Grades score from A = 12 down to E = 1/)).toBeInTheDocument();
    expect(screen.getByText(/KMTC \(36 courses\) and TVET \(70 programmes\) have no cut-off points/)).toBeInTheDocument();
  });
});
