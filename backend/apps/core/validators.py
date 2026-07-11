"""
Custom validators for input validation and sanitization across the API.
Provides validators for common data types and business logic.
"""

import re
from django.core.exceptions import ValidationError
from django.utils.text import slugify
import html


# ==================== String Sanitization ====================

def sanitize_string(value, max_length=None, allow_special_chars=False):
    """
    Sanitize and validate string input.
    
    Args:
        value (str): String to sanitize
        max_length (int): Maximum allowed length
        allow_special_chars (bool): Allow special characters
        
    Returns:
        str: Sanitized string
        
    Raises:
        ValidationError: If validation fails
    """
    if not isinstance(value, str):
        raise ValidationError(f"Expected string, got {type(value).__name__}")
    
    # Remove extra whitespace
    value = value.strip()
    
    # HTML escape to prevent XSS
    value = html.escape(value)
    
    # Check length
    if max_length and len(value) > max_length:
        raise ValidationError(f"String exceeds maximum length of {max_length} characters")
    
    # Remove potentially dangerous characters if not allowed
    if not allow_special_chars:
        # Remove characters that could be used for injection
        dangerous_chars = r'[<>"\'\\/;{}[\]|&$@#~!]'
        if re.search(dangerous_chars, value):
            raise ValidationError("String contains invalid characters")
    
    return value


def validate_phone_number(value):
    """
    Validate phone number format.
    Accepts local format (10 digits starting with 0) or international format with +.
    
    Args:
        value (str): Phone number to validate
        
    Raises:
        ValidationError: If phone number is invalid
    """
    if not value:
        raise ValidationError("Phone number cannot be empty")
    
    # Remove common separators
    cleaned = re.sub(r'[\s\-().]', '', value)
    
    # Check if it's a local number (10 digits starting with 0)
    if cleaned.startswith('0') and len(cleaned) == 10 and cleaned.isdigit():
        return value
    
    # Check if it starts with + (international) or has only digits
    if not (cleaned.startswith('+') or cleaned.isdigit()):
        raise ValidationError("Phone number must contain only digits and optional + prefix")
    
    # Length validation (international format)
    digits_only = re.sub(r'\D', '', cleaned)
    if len(digits_only) < 9 or len(digits_only) > 15:
        raise ValidationError("Phone number must be 9-15 digits long")
    
    return value


def validate_email_format(value):
    """
    Validate email format.
    
    Args:
        value (str): Email to validate
        
    Raises:
        ValidationError: If email is invalid
    """
    if not value:
        raise ValidationError("Email cannot be empty")
    
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_pattern, value):
        raise ValidationError("Invalid email format")
    
    # Check length
    if len(value) > 254:  # RFC 5321
        raise ValidationError("Email address is too long")
    
    return value


# ==================== Numeric Validation ====================

def validate_price(value):
    """
    Validate price/decimal value.
    
    Args:
        value (Decimal or float): Price to validate
        
    Raises:
        ValidationError: If price is invalid
    """
    try:
        price = float(value)
    except (ValueError, TypeError):
        raise ValidationError("Price must be a valid number")
    
    if price < 0:
        raise ValidationError("Price cannot be negative")
    
    if price == 0:
        raise ValidationError("Price must be greater than 0")
    
    return value


def validate_positive_integer(value):
    """
    Validate that value is a positive integer.
    
    Args:
        value (int): Value to validate
        
    Raises:
        ValidationError: If value is not a positive integer
    """
    try:
        num = int(value)
    except (ValueError, TypeError):
        raise ValidationError("Value must be an integer")
    
    if num < 0:
        raise ValidationError("Value cannot be negative")
    
    return value


def validate_non_negative_integer(value):
    """
    Validate that value is a non-negative integer (including 0).
    
    Args:
        value (int): Value to validate
        
    Raises:
        ValidationError: If value is not a non-negative integer
    """
    try:
        num = int(value)
    except (ValueError, TypeError):
        raise ValidationError("Value must be an integer")
    
    if num < 0:
        raise ValidationError("Value cannot be negative")
    
    return value


# ==================== Business Logic Validation ====================

def validate_imei(value):
    """
    Validate IMEI format (15-digit number).
    Includes Luhn algorithm check.
    
    Args:
        value (str): IMEI to validate
        
    Raises:
        ValidationError: If IMEI is invalid
    """
    if not value:
        raise ValidationError("IMEI cannot be empty")
    
    # Remove spaces and dashes
    imei = re.sub(r'[\s\-]', '', str(value))
    
    # Check if it's all digits
    if not imei.isdigit():
        raise ValidationError("IMEI must contain only digits")
    
    # Check length (should be 15 digits)
    if len(imei) != 15:
        raise ValidationError("IMEI must be exactly 15 digits long")
    
    # Validate using Luhn algorithm
    def luhn_checksum(num):
        digits = [int(d) for d in str(num)]
        digits.reverse()
        total = 0
        for i, d in enumerate(digits):
            if i % 2 == 1:
                d = d * 2
                if d > 9:
                    d = d - 9
            total += d
        return total % 10 == 0
    
    if not luhn_checksum(imei):
        raise ValidationError("IMEI failed validation (Luhn checksum)")
    
    return value


def validate_username(value):
    """
    Validate username format.
    Allows alphanumeric, dots, underscores, and hyphens.
    
    Args:
        value (str): Username to validate
        
    Raises:
        ValidationError: If username is invalid
    """
    if not value:
        raise ValidationError("Username cannot be empty")
    
    if len(value) < 3:
        raise ValidationError("Username must be at least 3 characters long")
    
    if len(value) > 150:
        raise ValidationError("Username must be at most 150 characters long")
    
    # Allow alphanumeric, dots, underscores, hyphens
    if not re.match(r'^[a-zA-Z0-9._-]+$', value):
        raise ValidationError("Username can only contain letters, numbers, dots, underscores, and hyphens")
    
    # Cannot start or end with special characters
    if value[0] in '._-' or value[-1] in '._-':
        raise ValidationError("Username cannot start or end with special characters")
    
    return value


def validate_password_strength(value):
    """
    Validate password - accepts any non-empty string.
    
    Args:
        value (str): Password to validate
        
    Raises:
        ValidationError: If password is empty
    """
    if not value:
        raise ValidationError("Password cannot be empty")
    
    return value


def validate_storage_format(value):
    """
    Validate storage format (e.g., 128GB, 256GB, 512GB, 1TB).
    
    Args:
        value (str): Storage value to validate
        
    Raises:
        ValidationError: If storage format is invalid
    """
    if not value:
        raise ValidationError("Storage cannot be empty")
    
    # Allow formats like "128GB", "256GB", "1TB", "512MB"
    if not re.match(r'^\d+\s*(GB|TB|MB)$', value, re.IGNORECASE):
        raise ValidationError("Storage format must be like '128GB', '1TB', etc.")
    
    return value


def validate_ram_format(value):
    """
    Validate RAM format (e.g., 4GB, 8GB, 12GB, 16GB).
    
    Args:
        value (str): RAM value to validate
        
    Raises:
        ValidationError: If RAM format is invalid
    """
    # Allow empty/None values (RAM is optional)
    if not value or (isinstance(value, str) and value.strip() == ''):
        return None
    
    # Allow formats like "4GB", "8GB", "16GB"
    if not re.match(r'^\d+\s*GB$', value, re.IGNORECASE):
        raise ValidationError("RAM format must be like '4GB', '8GB', '16GB', etc.")
    
    return value


def validate_quantity(value):
    """
    Validate quantity for sales and inventory.
    
    Args:
        value (int): Quantity to validate
        
    Raises:
        ValidationError: If quantity is invalid
    """
    try:
        qty = int(value)
    except (ValueError, TypeError):
        raise ValidationError("Quantity must be an integer")
    
    if qty <= 0:
        raise ValidationError("Quantity must be greater than 0")
    
    if qty > 999999:
        raise ValidationError("Quantity exceeds maximum allowed value")
    
    return value


def validate_discount(value):
    """
    Validate discount value (percentage: 0-100 or fixed amount).
    
    Args:
        value (Decimal or float): Discount value
        
    Raises:
        ValidationError: If discount is invalid
    """
    try:
        discount = float(value)
    except (ValueError, TypeError):
        raise ValidationError("Discount must be a valid number")
    
    if discount < 0:
        raise ValidationError("Discount cannot be negative")
    
    # Removed 100% limit as discounts can be fixed amounts
    # if discount > 100:
    #     raise ValidationError("Discount cannot exceed 100")
    
    return value


# ==================== Collection Validators ====================

def validate_choices(value, choices):
    """
    Validate that value is in allowed choices.
    
    Args:
        value: Value to validate
        choices (list): List of allowed values
        
    Raises:
        ValidationError: If value is not in choices
    """
    if value not in choices:
        raise ValidationError(f"Invalid choice. Allowed values: {', '.join(str(c) for c in choices)}")
    
    return value


# ==================== Batch Sanitization ====================

def sanitize_dict(data, field_specs):
    """
    Sanitize a dictionary of fields based on specifications.
    
    Args:
        data (dict): Dictionary to sanitize
        field_specs (dict): Field specifications with validators
        
    Returns:
        dict: Sanitized dictionary
        
    Raises:
        ValidationError: If any field fails validation
    """
    sanitized = {}
    
    for field, spec in field_specs.items():
        if field in data:
            value = data[field]
            
            # Apply validators
            for validator in spec.get('validators', []):
                value = validator(value)
            
            sanitized[field] = value
    
    return sanitized
