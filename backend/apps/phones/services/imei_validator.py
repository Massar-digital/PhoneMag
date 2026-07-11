import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class IMEIValidationError(Exception):
    """Custom exception for IMEI validation failures"""
    pass


def validate_with_external_api(imei: str, timeout: int = 5):
    """Validate IMEI with an external API configured via settings.

    Returns a dict with keys:
      - valid: bool
      - details: dict (optional) - raw response or parsed fields
      - error: str (optional) - error message when invalid or a problem occurred

    If the API is not configured or disabled, returns None.
    """
    if not settings.IMEI_VALIDATION_ENABLED:
        return None

    api_url = settings.IMEI_VALIDATION_API_URL
    api_key = settings.IMEI_VALIDATION_API_KEY

    if not api_url:
        raise IMEIValidationError("IMEI validation API URL is not configured")

    headers = {}
    if api_key:
        # Many services accept an Authorization header or x-api-key
        headers['x-api-key'] = api_key
        headers['Authorization'] = f'Bearer {api_key}'

    params = {'imei': str(imei)}

    try:
        resp = requests.get(api_url, params=params, headers=headers, timeout=timeout)
    except requests.RequestException as ex:
        logger.exception("IMEI validation API request failed")
        raise IMEIValidationError(f"External IMEI validation failed: {ex}")

    # Accept non-200 as error
    if resp.status_code != 200:
        logger.warning("IMEI validation API returned status %s: %s", resp.status_code, resp.text)
        raise IMEIValidationError(f"External IMEI validation failed: {resp.status_code}")

    try:
        data = resp.json()
    except ValueError:
        logger.warning("IMEI validation API returned malformed JSON: %s", resp.text)
        raise IMEIValidationError("External IMEI validation returned invalid JSON")

    # Basic handling for commonly returned fields. Different providers use different schema.
    # Normalize a minimal 'valid' bool and pass other details.
    result = {
        'valid': False,
        'details': data,
    }

    # Try to interpret common patterns
    if isinstance(data, dict):
        # Example: some APIs return {"imei": "...", "valid": true}
        if 'valid' in data and isinstance(data['valid'], bool):
            result['valid'] = data['valid']
        # Example: {"imei_status": "valid"}
        elif 'imei_status' in data and isinstance(data['imei_status'], str):
            result['valid'] = data['imei_status'].lower() in ('valid', 'ok', 'true')
        # If API provides 'error' or 'message' -> invalid
        elif 'error' in data or 'message' in data:
            # Some APIs use 'message' field to indicate an invalid IMEI
            # We set valid to False and include the message
            result['valid'] = False
            # If error is string, set an error message
            if 'message' in data and isinstance(data['message'], str):
                result['error'] = data['message']
            elif 'error' in data and isinstance(data['error'], str):
                result['error'] = data['error']
    else:
        # If it's a plain boolean, assume it's the 'valid' flag
        if isinstance(data, bool):
            result['valid'] = data

    return result
