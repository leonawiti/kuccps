import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from catalogue.build import build_catalogue
from catalogue.loader import DEFAULT_PATH

DEFAULT_SOURCE = Path(__file__).resolve().parents[4] / 'docs' / 'reference' / 'degree-choices-eligibility-system-draft-2.xlsx'


class Command(BaseCommand):
    help = 'Build catalogue/data/degrees.json (and a defect report) from the draft workbook.'

    def add_arguments(self, parser):
        parser.add_argument('--source', default=str(DEFAULT_SOURCE))
        parser.add_argument('--out', default=str(DEFAULT_PATH))

    def handle(self, *args, **options):
        source = Path(options['source'])
        if not source.exists():
            raise CommandError(f'Workbook not found: {source}')
        programmes, report = build_catalogue(source)
        out = Path(options['out'])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            json.dumps({'source': source.name, 'report': {k: v for k, v in report.items() if k != 'defects'},
                        'programmes': programmes}, ensure_ascii=False, separators=(',', ':')),
            encoding='utf-8')
        out.with_name('build-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(f'{len(programmes)} programmes written to {out}'))
        for key, value in report.items():
            if key != 'defects':
                self.stdout.write(f'  {key}: {value}')
        self.stdout.write(f'  defects listed in {out.with_name("build-report.json")}: {len(report["defects"])}')
