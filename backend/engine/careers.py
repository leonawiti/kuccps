"""
Career family grouping: which of the three CBE senior-school pathways a degree programme belongs to.

The pathways are STEM; Social Sciences (with humanities, languages, business and education in arts subjects);
and Arts and Sports Science. **This is a keyword heuristic on the programme's name**, not an official mapping:
none of the provided documents maps degrees to pathways. It is deliberately simple and testable, and should be
checked with KICD / KUCCPS guidance before counsellors rely on it. Order matters: the first rule that matches
wins (see tests for the borderline cases).
"""
import re

PATHWAYS = {
    'stem': 'STEM',
    'social': 'Social Sciences and Humanities',
    'arts_sports': 'Arts and Sports Science',
}

_ARTS_SPORTS = r'music|sport|fine art|\bfilm|theatre|drama|performing|fashion|animation|\bdance|physical education|graphic design|interior design|textile|creative'

_STEM_STRONG = (
    r'engineering|medicine|surgery|nursing|pharmac|computer|computing|software|information technology|'
    r'informatics|data science|mathematic|statistic|actuarial|physics|chemistry|biolog|biochem|biotechnolog|'
    r'microbiolog|agricultur|agri\b|agribusiness|veterinary|dental|architecture|surveying|geospatial|geolog|'
    r'environmental|food|nutrition|dietetics|laboratory|clinical|medical|health|aquaculture|horticulture|'
    r'fisheries|forestry|animal|water|energy|construction|telecommunication|electronic|instrumentation|'
    r'biomedical|natural resource|conservation|marine|analytical|industrial|security|cyber'
)

_SOCIAL = (
    r'economics|business|commerce|finance|financial|accounting|\blaws?\b|\barts\b|social|psycholog|sociolog|'
    r'journalism|communication|public|political|development|international|criminolog|linguistic|language|'
    r'kiswahili|english|french|history|geography|theolog|religio|human resource|procurement|supply|marketing|'
    r'entrepreneur|tourism|hospitality|hotel|travel|library|counsel|community|project|peace|conflict|gender|'
    r'diplomacy|leadership|philosophy|literature|education'
)

_RULES = [
    ('arts_sports', re.compile(_ARTS_SPORTS)),
    ('stem', re.compile(_STEM_STRONG)),
    ('stem', re.compile(r'education.*\b(science|technology)\b')),  # teaching a science subject
    ('social', re.compile(_SOCIAL)),
    ('stem', re.compile(r'science|technology')),
]


def pathway_of(programme_name):
    name = re.sub(r'\s+', ' ', programme_name or '').strip().lower()
    for pathway, pattern in _RULES:
        if pattern.search(name):
            return pathway
    return 'social'
