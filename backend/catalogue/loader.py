"""Loading the built catalogue (catalogue/data/degrees.json) for the API. Read once and kept in memory."""
import json
from functools import lru_cache
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parent / 'data' / 'degrees.json'


class CatalogueMissing(RuntimeError):
    """degrees.json has not been built. Run: python manage.py build_catalogue"""


def load_catalogue(path=DEFAULT_PATH):
    path = Path(path)
    if not path.exists():
        raise CatalogueMissing(f'{path} not found. Run: python manage.py build_catalogue')
    return json.loads(path.read_text(encoding='utf-8'))


@lru_cache(maxsize=1)
def catalogue():
    return load_catalogue()


@lru_cache(maxsize=1)
def programmes_by_code():
    return {p['code']: p for p in catalogue()['programmes']}
