import { useApp } from '../state/app-context';
import { PageTitle } from './ui';

export function About() {
  const { meta } = useApp();
  const report = meta.catalogue.report;
  return (
    <div className="max-w-3xl space-y-4 text-sm">
      <PageTitle sub="How the tool reaches its answers, what it assumes, and where it can be wrong.">About this tool</PageTitle>

      <section className="card space-y-2">
        <h2 className="font-display text-lg font-semibold">What it does</h2>
        <p>
          It works as an eligibility checker, a ranking tool and a counselling aid for learners choosing degree programmes through KUCCPS.
          Enter KCSE grades and it shows every programme in four bands, helps check a list of up to four choices, groups programmes into
          career families, and can analyse a whole class.
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-display text-lg font-semibold">How cluster points are worked out</h2>
        <p>
          Each programme names up to four subjects. Your points in those four add up to <em>r</em> (at most 48). Your best seven subjects
          add up to <em>t</em> (at most 84). Cluster points are 48 &times; &radic;((r &divide; 48) &times; (t &divide; 84)). A programme is open to you when
          you meet its subject grade requirements and your cluster points reach its cut-off.
        </p>
        <p>Grades score from A = 12 down to E = 1.</p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-display text-lg font-semibold">The four bands</h2>
        <dl className="space-y-1">
          {meta.bands.map((b) => (
            <div key={b.key}><dt className="inline font-semibold">{b.label}: </dt><dd className="inline">{b.description}</dd></div>
          ))}
        </dl>
        <p>
          <strong>Classic</strong> bands use a fixed 2 points either side of the cut-off. <strong>Flexible</strong> bands are 1.5 times the
          programme's typical yearly movement in its own cut-off, between 1 and 5 points, because some cut-offs barely move while others
          jump several points. Preferences for a university or career family only reorder programmes inside a band.
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-display text-lg font-semibold">Things to know before relying on it</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>The data is a draft workbook of {meta.catalogue.programmes.toLocaleString()} degree programmes at {meta.catalogue.institutions.length} institutions, with cut-offs for 2018 to 2024. It is not a live KUCCPS feed.</li>
          {report ? (
            <li>
              {report.no_cutoff} programmes have no published cut-off and cannot be banded. {report.slots_none} list no subject requirements and {report.slots_defective} have
              requirements that could not be read; these are still banded using your best four subjects and are flagged.
            </li>
          ) : null}
          <li>Some 2024 figures are averages of earlier years for programmes that were new, not published cut-offs.</li>
          <li>The subjects listed for each programme are minimum requirements. KUCCPS's own cluster-subject lists may differ, and where a programme lists fewer than four, your best remaining subjects fill the rest.</li>
          <li>The mean-grade table is the usual KNEC conversion but has not been checked against KNEC's own publication.</li>
          <li>Career families (STEM, Social Sciences and Humanities, Arts and Sports Science, after the CBE pathways) are assigned from programme names by simple rules. Treat them as a guide.</li>
          <li>Diploma, certificate, TVET and KMTC programmes are not included yet.</li>
        </ul>
      </section>

      <section className="card space-y-2">
        <h2 className="font-display text-lg font-semibold">Privacy</h2>
        <p>
          There are no accounts. Grades and choices are kept in this browser only, so they are still here when you come back, and are sent to the
          server just to be calculated, not stored. Class mark sheets are analysed and forgotten. Clearing your browser data removes everything.
        </p>
      </section>
    </div>
  );
}
