from django.conf import settings
from django.test import SimpleTestCase
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework.throttling import AnonRateThrottle


def ident(**headers):
    """The address the rate limiter would count a request against."""
    request = Request(APIRequestFactory().get('/api/meta/', **headers))
    return AnonRateThrottle().get_ident(request)


class RateLimitIdentityTests(SimpleTestCase):
    """The API runs behind one nginx. Without this, every visitor shares nginx's address and so one 60-a-minute limit."""

    def test_the_site_is_configured_for_exactly_one_proxy(self):
        self.assertEqual(settings.REST_FRAMEWORK['NUM_PROXIES'], 1)

    def test_visitors_are_told_apart_by_the_address_nginx_recorded(self):
        a = ident(HTTP_X_FORWARDED_FOR='41.90.0.1', REMOTE_ADDR='127.0.0.1')
        b = ident(HTTP_X_FORWARDED_FOR='41.90.0.2', REMOTE_ADDR='127.0.0.1')
        self.assertEqual((a, b), ('41.90.0.1', '41.90.0.2'))

    def test_a_visitor_cannot_dodge_the_limit_by_sending_their_own_forwarded_header(self):
        # nginx appends the real address to whatever the visitor sent; only the last entry is trusted.
        spoofed = ident(HTTP_X_FORWARDED_FOR='6.6.6.6, 41.90.0.1', REMOTE_ADDR='127.0.0.1')
        self.assertEqual(spoofed, '41.90.0.1')

    def test_without_a_proxy_header_the_direct_address_is_used(self):
        # Local development (no nginx in front).
        self.assertEqual(ident(REMOTE_ADDR='10.0.0.5'), '10.0.0.5')
