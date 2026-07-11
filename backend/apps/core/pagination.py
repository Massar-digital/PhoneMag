from rest_framework.pagination import PageNumberPagination


class CustomPageNumberPagination(PageNumberPagination):
    """Custom PageNumberPagination with configurable page_size via query param.

    Defaults to 20 items per page, allows overriding via `?page_size=NUMBER` up to max_page_size.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000
