from rest_framework.response import Response
from rest_framework.views import exception_handler

from catalogue.loader import CatalogueMissing


def handler(exc, context):
    """A missing catalogue is the server's problem (503, with how to fix it); an engine ValueError is the caller's (400)."""
    if isinstance(exc, CatalogueMissing):
        return Response({'detail': str(exc)}, status=503)
    if isinstance(exc, ValueError):
        return Response({'detail': str(exc)}, status=400)
    return exception_handler(exc, context)
