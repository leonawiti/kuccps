"""All KMTC and TVET entries in one list. The data lives in colleges_data.py (KMTC) and colleges_tvet.py (TVET)."""
from .colleges_data import KMTC
from .colleges_tvet import TVET

COLLEGES = KMTC + TVET
