from unittest import mock

from django.test import SimpleTestCase
from rest_framework.test import APIClient

from catalogue import loader

SLOTS = [
    {'alternatives': ['BIO'], 'min_grade': 'C+'}, {'alternatives': ['CHE'], 'min_grade': 'C+'},
    {'alternatives': ['MAT A', 'PHY'], 'min_grade': 'C+'}, {'alternatives': ['ENG', 'KIS'], 'min_grade': 'C'},
]


def prog(code, cutoff, institution='Alpha University', pathway='stem', name=None):
    return {'code': code, 'institution': institution, 'name': name or f'BSC {code}', 'family': 'F', 'pathway': pathway,
            'cutoffs': {'2024': cutoff} if cutoff else {}, 'slots': SLOTS, 'slots_status': 'ok'}


FAKE = {'source': 'test.xlsx', 'report': {'programmes': 5}, 'programmes': [
    prog('101', 30.0),                                                                    # safe for MID (38.545)
    prog('102', 38.0, institution='Beta University', pathway='social', name='BA LAW'),    # best fit
    prog('103', 40.0, institution='Beta University', name='BSC NURSING'),                 # stretch
    prog('104', 50.0, institution='Gamma College', pathway='arts_sports', name='B MUSIC'),  # excluded
    prog('105', None),                                                                    # no cut-off
]}

# ENG B, KIS B+, MAT A A-, BIO B, CHE B+, PHY B, GEO C+  ->  total 65, cluster points 38.545
MID = {'ENG': 'B', 'KIS': 'B+', 'MAT A': 'A-', 'BIO': 'B', 'CHE': 'B+', 'PHY': 'B', 'GEO': 'C+'}


class ApiTestCase(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()
        patcher = mock.patch.object(loader, 'load_catalogue', return_value=FAKE)
        patcher.start()
        self.addCleanup(patcher.stop)
        loader.catalogue.cache_clear()
        loader.programmes_by_code.cache_clear()
        self.addCleanup(loader.catalogue.cache_clear)
        self.addCleanup(loader.programmes_by_code.cache_clear)

    def post(self, url, body):
        return self.client.post(url, body, format='json')


class MetaTests(ApiTestCase):
    def test_meta_lists_subjects_grades_pathways_bands_and_the_catalogue_size(self):
        r = self.client.get('/api/meta/')

        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn({'key': 'ENG', 'number': '101', 'name': 'English', 'group': 1}, data['subjects'])
        self.assertEqual([g['grade'] for g in data['grades']][:3], ['A', 'A-', 'B+'])
        self.assertEqual(data['grades'][0]['points'], 12)
        self.assertEqual(sorted(p['key'] for p in data['pathways']), ['arts_sports', 'social', 'stem'])
        self.assertEqual([b['key'] for b in data['bands']], ['best_fit', 'safe', 'stretch', 'excluded'])
        self.assertEqual(data['catalogue']['programmes'], 5)
        self.assertEqual(data['catalogue']['institutions'], ['Alpha University', 'Beta University', 'Gamma College'])


class ProgrammesTests(ApiTestCase):
    def codes(self, query):
        return [p['code'] for p in self.client.get('/api/programmes/' + query).json()['results']]

    def test_search_by_text_institution_and_pathway(self):
        self.assertEqual(self.codes('?q=nursing'), ['103'])
        self.assertEqual(self.codes('?institution=Beta University'), ['102', '103'])
        self.assertEqual(self.codes('?pathway=arts_sports'), ['104'])

    def test_the_result_is_limited_and_reports_the_total(self):
        data = self.client.get('/api/programmes/?limit=2').json()
        self.assertEqual((len(data['results']), data['total']), (2, 5))


class EligibilityTests(ApiTestCase):
    def test_programmes_are_grouped_by_band_and_the_learner_summarised(self):
        r = self.post('/api/eligibility/', {'grades': MID, 'mode': 'classic'})

        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data['learner']['total'], 65)
        self.assertEqual(data['learner']['mean_grade'], 'B')
        self.assertEqual(data['counts'], {'best_fit': 1, 'safe': 1, 'stretch': 1, 'excluded': 1, 'no_data': 1})
        self.assertEqual([p['code'] for p in data['bands']['best_fit']], ['102'])
        self.assertEqual([p['code'] for p in data['bands']['safe']], ['101'])
        self.assertEqual([p['code'] for p in data['bands']['stretch']], ['103'])
        self.assertEqual([p['code'] for p in data['bands']['excluded']], ['104'])
        self.assertEqual([p['code'] for p in data['bands']['no_data']], ['105'])
        self.assertEqual(data['bands']['safe'][0]['cluster'], 38.545)

    def test_filters_narrow_the_programmes_considered(self):
        data = self.post('/api/eligibility/', {'grades': MID, 'mode': 'classic', 'institutions': ['Beta University']}).json()
        self.assertEqual(data['counts'], {'best_fit': 1, 'safe': 0, 'stretch': 1, 'excluded': 0, 'no_data': 0})

        data = self.post('/api/eligibility/', {'grades': MID, 'mode': 'classic', 'pathways': ['arts_sports']}).json()
        self.assertEqual(data['counts']['excluded'], 1)
        self.assertEqual(sum(data['counts'].values()), 1)

        data = self.post('/api/eligibility/', {'grades': MID, 'mode': 'classic', 'q': 'law'}).json()
        self.assertEqual([p['code'] for p in data['bands']['best_fit']], ['102'])
        self.assertEqual(sum(data['counts'].values()), 1)

    def test_each_band_is_limited_but_the_counts_are_the_full_totals(self):
        body = {'grades': MID, 'mode': 'classic', 'limit': 1}
        data = self.post('/api/eligibility/', body).json()
        self.assertTrue(all(len(v) <= 1 for v in data['bands'].values()))

        # Two safe programmes with limit 1.
        extra = {**FAKE, 'programmes': FAKE['programmes'] + [prog('106', 20.0)]}
        with mock.patch.object(loader, 'load_catalogue', return_value=extra):
            loader.catalogue.cache_clear()
            loader.programmes_by_code.cache_clear()
            data = self.post('/api/eligibility/', body).json()
        self.assertEqual(data['counts']['safe'], 2)
        self.assertEqual(len(data['bands']['safe']), 1)
        self.assertTrue(data['truncated']['safe'])
        self.assertFalse(data['truncated']['best_fit'])

    def test_preferences_reorder_within_a_band(self):
        extra = {**FAKE, 'programmes': FAKE['programmes'] + [prog('106', 20.0, institution='Gamma College')]}
        with mock.patch.object(loader, 'load_catalogue', return_value=extra):
            loader.catalogue.cache_clear()
            loader.programmes_by_code.cache_clear()
            plain = self.post('/api/eligibility/', {'grades': MID, 'mode': 'classic'}).json()
            wished = self.post('/api/eligibility/', {'grades': MID, 'mode': 'classic',
                                                     'preferences': {'institutions': {'Gamma College': 2}}}).json()
        self.assertEqual([p['code'] for p in plain['bands']['safe']], ['101', '106'])
        self.assertEqual([p['code'] for p in wished['bands']['safe']], ['106', '101'])

    def test_flexible_is_the_default_mode(self):
        data = self.post('/api/eligibility/', {'grades': MID}).json()
        self.assertEqual(data['mode'], 'flexible')

    def test_bad_input_is_refused_with_a_message(self):
        cases = [
            {},                                                  # no grades
            {'grades': {'ENG': 'A', 'KIS': 'A'}},                # too few subjects
            {'grades': {**MID, 'GEO': 'F'}},                     # not a grade
            {'grades': {**MID, 'Astrology': 'A'}},               # not a subject
            {'grades': MID, 'mode': 'wild'},                     # unknown mode
            {'grades': MID, 'limit': 0},                         # limit out of range
            {'grades': MID, 'pathways': ['space']},              # unknown pathway
            {'grades': MID, 'preferences': {'institutions': {'Alpha University': -1}}},
            {'grades': MID, 'preferences': {'pathways': {'space': 1}}},  # unknown pathway in preferences
            {'grades': 'ABC'},                                   # wrong type
        ]
        for body in cases:
            r = self.post('/api/eligibility/', body)
            self.assertEqual(r.status_code, 400, body)
            self.assertTrue(r.json(), body)

    def test_only_post_is_allowed(self):
        self.assertEqual(self.client.get('/api/eligibility/').status_code, 405)


class ChoicesTests(ApiTestCase):
    def test_choices_are_analysed_in_order_with_advice(self):
        r = self.post('/api/choices/', {'grades': MID, 'mode': 'classic', 'choices': ['101', '103']})

        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual([c['code'] for c in data['choices']], ['101', '103'])
        self.assertEqual([c['band'] for c in data['choices']], ['safe', 'stretch'])
        self.assertEqual([a['code'] for a in data['advice']], ['fewer_than_four'])
        self.assertEqual(data['learner']['total'], 65)

    def test_choices_must_be_known_programmes_and_between_one_and_four(self):
        for choices in (['999'], [], ['101', '102', '103', '104', '105'], 'not a list'):
            r = self.post('/api/choices/', {'grades': MID, 'choices': choices})
            self.assertEqual(r.status_code, 400, choices)


class ClassTests(ApiTestCase):
    def test_a_class_is_summarised(self):
        body = {'mode': 'classic', 'learners': [{'name': 'Mid', 'grades': MID}, {'grades': {'ENG': 'A'}}]}
        r = self.post('/api/class/', body)

        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data['cohort']['learners'], 1)
        self.assertEqual(data['learners'][0]['name'], 'Mid')
        self.assertEqual(len(data['rejected']), 1)
        # Checked against the 106 KMTC and TVET programmes too.
        self.assertGreater(data['learners'][0]['colleges_eligible'], 20)
        self.assertEqual(data['cohort']['college_reach'], 1.0)

    def test_an_empty_or_malformed_class_is_refused(self):
        for body in ({'learners': []}, {}, {'learners': [{'name': 'x'}]}, {'learners': 'x'}):
            self.assertEqual(self.post('/api/class/', body).status_code, 400, body)


class ClassSizeTests(ApiTestCase):
    def test_a_class_over_the_limit_is_refused_with_the_limit_in_the_message(self):
        r = self.post('/api/class/', {'learners': [{'grades': MID}] * 301})
        self.assertEqual(r.status_code, 400)
        self.assertIn('300', r.json()['detail'])


class CollegesTests(ApiTestCase):
    # The KMTC and TVET data is part of the code, so these run against the real 106 entries.
    def ids(self, data, status):
        return [r['id'] for r in data['results'][status]]

    def test_every_entry_is_sorted_into_eligible_near_and_not_eligible(self):
        r = self.post('/api/colleges/', {'grades': MID, 'limit': 200})

        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data['learner']['mean_grade'], 'B')
        self.assertEqual(sum(data['counts'].values()), 106)
        self.assertIn('kmtc-28', self.ids(data, 'eligible'))  # Diploma in Pharmacy: met in full by this learner
        self.assertEqual(set(data['counts']), {'eligible', 'near', 'not_eligible'})

    def test_a_result_carries_the_course_and_where_it_came_from(self):
        data = self.post('/api/colleges/', {'grades': MID, 'q': 'pharmacy', 'limit': 50}).json()
        pharmacy = next(r for r in data['results']['eligible'] if r['id'] == 'kmtc-28')
        self.assertEqual((pharmacy['provider'], pharmacy['level'], pharmacy['page']), ('kmtc', 'diploma', 2))
        self.assertIn('Chemistry/Physical Science', pharmacy['source'])

    def test_a_course_not_met_lists_what_is_missing(self):
        weak = {s: 'D' for s in ('ENG', 'KIS', 'MAT A', 'BIO', 'CHE', 'PHY', 'GEO')}
        data = self.post('/api/colleges/', {'grades': weak, 'q': 'pharmacy', 'limit': 50}).json()
        item = next(r for r in data['results']['not_eligible'] if r['id'] == 'kmtc-28')
        self.assertTrue(any(u['kind'] == 'mean' for u in item['unmet']))

    def test_filters_by_provider_level_and_text(self):
        kmtc = self.post('/api/colleges/', {'grades': MID, 'providers': ['kmtc'], 'limit': 200}).json()
        self.assertEqual(sum(kmtc['counts'].values()), 36)

        certs = self.post('/api/colleges/', {'grades': MID, 'providers': ['tvet'], 'levels': ['certificate'], 'limit': 200}).json()
        self.assertEqual(sum(certs['counts'].values()), 24)

        found = self.post('/api/colleges/', {'grades': MID, 'q': 'pharmacy', 'limit': 50}).json()
        everything = [r['id'] for status in found['results'].values() for r in status]
        self.assertCountEqual(everything, ['kmtc-28', 'tvet-pharmacy-diploma'])

    def test_diplomas_come_before_certificates_within_a_status(self):
        data = self.post('/api/colleges/', {'grades': MID, 'limit': 200}).json()
        levels = [r['level'] for r in data['results']['eligible']]
        order = {'diploma': 0, 'certificate': 1, 'artisan': 2}
        self.assertEqual(levels, sorted(levels, key=order.get))

    def test_each_status_is_limited_but_the_counts_are_full(self):
        data = self.post('/api/colleges/', {'grades': MID, 'limit': 3}).json()
        self.assertEqual(len(data['results']['eligible']), 3)
        self.assertGreater(data['counts']['eligible'], 3)
        self.assertTrue(data['truncated']['eligible'])

    def test_bad_input_is_refused(self):
        for body in ({}, {'grades': MID, 'providers': ['nowhere']}, {'grades': MID, 'levels': ['phd']}, {'grades': MID, 'limit': 0},
                     {'grades': {'ENG': 'A'}}):
            self.assertEqual(self.post('/api/colleges/', body).status_code, 400, body)

    def test_meta_reports_how_many_college_programmes_there_are(self):
        data = self.client.get('/api/meta/').json()
        self.assertEqual(data['colleges'], {'kmtc': 36, 'tvet': 70})


class MissingCatalogueTests(SimpleTestCase):
    def test_a_missing_catalogue_is_a_clear_server_message_not_a_crash(self):
        loader.catalogue.cache_clear()
        with mock.patch.object(loader, 'DEFAULT_PATH', loader.Path('no-such-file.json')):
            with mock.patch.object(loader, 'load_catalogue', side_effect=loader.CatalogueMissing('build it')):
                r = APIClient().get('/api/meta/')
        loader.catalogue.cache_clear()
        self.assertEqual(r.status_code, 503)
        self.assertIn('build', r.json()['detail'])
